"use strict";

function getEyePosition(mv) {
	let u = vec3(mv[0][0], mv[0][1], mv[0][2]);
	let v = vec3(mv[1][0], mv[1][1], mv[1][2]);
	let n = vec3(mv[2][0], mv[2][1], mv[2][2]);
	let t = vec3(mv[0][3], mv[1][3], mv[2][3]);

	let axesInv = inverse3([u, v, n]);
	let eye = multM3V3(axesInv, t);
	return vec3(-eye[0], -eye[1], -eye[2]);
}

function setEyePosition(mv, eye) {
	let u = vec3(mv[0][0], mv[0][1], mv[0][2]);
	let v = vec3(mv[1][0], mv[1][1], mv[1][2]);
	let n = vec3(mv[2][0], mv[2][1], mv[2][2]);

	let negEye = vec3(-eye[0], -eye[1], -eye[2]);
	mv[0][3] = dot(negEye, u);
	mv[1][3] = dot(negEye, v);
	mv[2][3] = dot(negEye, n);
}

function multM3V3(u, v) {
	let result = [];
	result[0] = u[0][0] * v[0] + u[0][1] * v[1] + u[0][2] * v[2];
	result[1] = u[1][0] * v[0] + u[1][1] * v[1] + u[1][2] * v[2];
	result[2] = u[2][0] * v[0] + u[2][1] * v[1] + u[2][2] * v[2];
	return result;
}

//Loads a VAO and draws it
function drawVertexObject(vao, iLength, mA, mD, mS, s) {
	let ambientProduct = mult(lightAmbient, mA);
	let diffuseProduct = mult(lightDiffuse, mD);
	let specularProduct = mult(lightSpecular, mS);
	gl.uniform1f(gl.getUniformLocation(program, "shininess"), s);
	gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
	gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
	gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
	gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
	gl.uniform4fv(gl.getUniformLocation(program, "thrusterPosition"), flatten(thrusterPosition));

	gl.bindVertexArray(vao);
	gl.drawElements(gl.TRIANGLES, iLength, gl.UNSIGNED_SHORT, 0);
}

//Sets up a VAO 
function setUpVertexObject(shape, hasTexcoords) {
	let indices = shape.indices;
	let vertices = shape.vertices;
	let normals = shape.normals;

	let vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	//set up index buffer, if using
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);

	//set up vertices buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STREAM_DRAW);
	let attributeCoords = gl.getAttribLocation(program, "a_coords");
	gl.vertexAttribPointer(attributeCoords, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(attributeCoords);

	//set up normals buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STREAM_DRAW);
	let attributeNormals = gl.getAttribLocation(program, "a_normals");
	gl.vertexAttribPointer(attributeNormals, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(attributeNormals);

	//set up texture buffer
	if (hasTexcoords){
		let texcoords = shape.texcoord;
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, flatten(texcoords), gl.STATIC_DRAW);
		let texCoordLoc = gl.getAttribLocation(program, "a_texCoord");
		gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(texCoordLoc);
	}

	//finalize the vao
	gl.bindVertexArray(null);

	return vao;
}

function configureTexture( image, unitNum ) {
    texture = gl.createTexture();
	let units = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4]
	gl.activeTexture( units[unitNum] );  
    gl.bindTexture(gl.TEXTURE_2D, texture);

    //Flip the Y values to match the WebGL coordinates
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    //Specify the image as a texture array:
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
         
    //Set filters and parameters
    gl.generateMipmap(gl.TEXTURE_2D);

	switch (unitNum) {
		// ships
		case 0: gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				break;
		// finish line
		case 1: gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				break;
		// planet1
		case 2: //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
				//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				break;
	}
}