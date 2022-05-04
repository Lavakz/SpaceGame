let canvas;
let gl;

let near = 1;
let far = 1000;

let at = vec3(0.0, 0.0, -1.0);
let up = vec3(0.0, 1.0, 0.0);
let eye = vec3(0, 0, 900);

let uniformModelView, uniformProjection;
let modelViewMatrix, projectionMatrix;

let lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
let lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
let lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );

let program;
let objects;

let timer;
let theta = 0.0;

function init() {

	let canvas = document.getElementById("gl-canvas");
	let options = {
		alpha: false,
		depth: true
	};

	gl = canvas.getContext("webgl2", options);
	if (!gl) { alert("WebGL 2.0 isn't available"); }

	program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);

    modelViewMatrix = lookAt(eye, at , up); 
	projectionMatrix = perspective( 30, gl.canvas.width/gl.canvas.height, near, far );

	uniformModelView = gl.getUniformLocation(program, "u_modelViewMatrix");
	uniformProjection = gl.getUniformLocation(program, "u_projectionMatrix");

	// Materials
	const chrome = {
		ambient: vec4(0.25, 0.25, 0.25, 1.0),
		diffuse: vec4(0.4, 0.4, 0.4, 1.0),
		specular: vec4(0.77, 0.77, 0.77, 1.0),
		shininess: 0.6
	}

	// Shapes
	const spaceshipMesh = {
		vertices: myMesh.vertices[0].values,
		indices: myMesh.connectivity[0].indices,
		normals: myMesh.vertices[1].values
	}

	// Objects
	const myShip = {
		vao: setUpVertexObject(spaceshipMesh),
		indices: spaceshipMesh.indices,
		transform() {
			let eyePos = getEyePosition(modelViewMatrix);
			shipTransform = translate(eyePos[0], eyePos[1]-5, eyePos[2]-30);
			shipTransform = mult(shipTransform, rotateY(180));
			return shipTransform;
		},
		material: chrome,
		speed: 2
	}

	const planet1 = {
		vertices: v=createSphereVertices(30.0, 45, 45), 
		vao: setUpVertexObject(v, true),
		indices: v.indices,
		transform() {return translate(50.0, 0.0, 500.0)},
		material: chrome
	};

	objects = [myShip, planet1];

	//Initialize texture
    let image = new Image();
    image.src = document.getElementById("volcanoPlanetTex").src; 
    image.onload = function() {
        configureTexture( image, program );
    }

	document.onkeydown = function(ev) { keyHandler(ev); };

	timer = document.getElementById("timer").innerHTML;
	setTimeout(updateTimer, 500);

	//set up screen
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.clearColor(0, 0, 0, 1);

	//Enable depth testing    
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1.0, 2.0);

	draw();
}

function keyHandler(event) {
	switch (event.key) {
		case "a": rollLeft(); break;
		case "d": rollRight(); break;
		case "w": turnUp(0.1); break;
		case "s": turnDown(0.1); break;
	}
}

function bankLeft(){
    // rotate around at vector
}

function bankRight(){
    // rotate around at vector
}

function turnUp(t){
	theta -= t;
	let s = Math.sin(theta);
	let c = Math.cos(theta);
	console.log(theta, s, c);
    at = normalize(vec3(0, s, -c));
	up = normalize(vec3(0, s, -c));
}

function turnDown(t){
    turnUp(-t)
}

function updateTimer() {
	let dt = Date.now() - (Date.now() + 500);
	let timer = document.getElementById("timer");
	let seconds = timer.innerHTML.substring(3);
	let minutes = timer.innerHTML.substring(0, 2);
	
	if (parseInt(seconds) + 1 === 60) {
		let newMinutes = parseInt(minutes) + 1;
		minutes = newMinutes.toString();

		if (minutes.length === 1) {
			minutes = "0" + minutes;
		}

		seconds = "00";
	} else {
		let newSeconds = parseInt(seconds) + 1;
		seconds = newSeconds.toString();

		if (seconds.length === 1) {
			seconds = "0" + seconds;
		}
	}

	timer.innerHTML = minutes + ":" + seconds;
	setTimeout(updateTimer, Math.max(0, 500 - dt));
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

	gl.bindVertexArray(vao);
	gl.drawElements(gl.TRIANGLES, iLength, gl.UNSIGNED_SHORT, 0);
}

//Sets up a VAO 
function setUpVertexObject(shape, isTextured) {
	let indices = shape.indices;
	let vertices = shape.vertices;
	let normals = shape.normals;

	vao = gl.createVertexArray();
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
	if (isTextured){
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

function configureTexture( image, program ) {
    texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );  
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    //Flip the Y values to match the WebGL coordinates
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    //Specify the image as a texture array:
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
         
    //Set filters and parameters
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    //Link texture to a sampler in fragment shader
    gl.uniform1i(gl.getUniformLocation(program, "u_textureMap"), 0);
}

function getEyePosition( mv ){
    let u = vec3(mv[0][0],mv[0][1],mv[0][2]);       
    let v = vec3(mv[1][0],mv[1][1],mv[1][2]); 
    let n = vec3(mv[2][0],mv[2][1],mv[2][2]); 
    let t = vec3(mv[0][3],mv[1][3],mv[2][3]);

    let axesInv = inverse3([u,v,n]);
    let eye = multM3V3(axesInv,t);
    return vec3(-eye[0],-eye[1],-eye[2]);
}

function setEyePosition( mv, eye ){
    let u = vec3(mv[0][0],mv[0][1],mv[0][2]);       
    let v = vec3(mv[1][0],mv[1][1],mv[1][2]); 
    let n = vec3(mv[2][0],mv[2][1],mv[2][2]); 

    let negEye = vec3(-eye[0], -eye[1], -eye[2]);
    mv[0][3] = dot(negEye,u);
    mv[1][3] = dot(negEye,v);
    mv[2][3] = dot(negEye,n);
}

function multM3V3( u, v ) {
    let result = [];
    result[0] = u[0][0]*v[0] + u[0][1]*v[1] + u[0][2]*v[2];
    result[1] = u[1][0]*v[0] + u[1][1]*v[1] + u[1][2]*v[2];
    result[2] = u[2][0]*v[0] + u[2][1]*v[1] + u[2][2]*v[2];
    return result;
}

function draw() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	projectionMatrix = perspective(30.0, gl.canvas.width/gl.canvas.height, near, far);
	gl.uniformMatrix4fv(uniformProjection, false, flatten(projectionMatrix));
	
	// move eye in at direction
	eye = vec3(eye[0]+(at[0]/objects[0].speed), 
			   eye[1]-(at[1]/objects[0].speed), 
		       eye[2]+(at[2]/objects[0].speed));
	modelViewMatrix = lookAt(eye, at , up); 

	objects.forEach((obj) => {
		gl.uniformMatrix4fv(uniformModelView, false,
			flatten(mult(modelViewMatrix, obj.transform())));
		drawVertexObject(obj.vao,
			obj.indices.length,
			obj.material.ambient, obj.material.diffuse,
			obj.material.specular, obj.material.shininess);
	});

	requestAnimationFrame(draw);
}