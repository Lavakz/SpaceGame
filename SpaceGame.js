let canvas;
let gl;

let near = -100;
let far = 100;
let left = -10.0;
let right = 10.0;
let ytop = 10.0;
let bottom = -10.0;

let at = vec3(1.0, 0.0, 0.0);
let up = vec3(0.0, 1.0, 0.0);

let uniformModelView, uniformProjection;
let modelViewMatrix, projectionMatrix;

let lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
let lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
let lightPosition = vec4(0.0, 0.0, 1.0, 1.0);

let program;
let objects;

let timer;

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

	uniformModelView = gl.getUniformLocation(program, "u_modelViewMatrix");
	uniformProjection = gl.getUniformLocation(program, "u_projectionMatrix");

	// Materials
	const chrome = {
		ambient: vec4(0.25, 0.25, 0.25, 1.0),
		diffuse: vec4(0.4, 0.4, 0.4, 1.0),
		specular: vec4(0.77, 0.77, 0.77, 1.0),
		shininess: 0.6
	}

	// Meshes
	const spaceshipMesh = {
		vertices: myMesh.vertices[0].values,
		indices: myMesh.connectivity[0].indices,
		normals: myMesh.vertices[1].values
	}

	// Objects
	const myShip = {
		vao: setUpVertexObject(spaceshipMesh),
		indices: spaceshipMesh.indices,
		transform: translate(0.0, 0.0, 0.0),
		material: chrome
	}

	const rivalShip = {
		vao: setUpVertexObject(spaceshipMesh),
		indices: spaceshipMesh.indices,
		transform: mult(translate(0.0, 4.0, 4.0), rotateZ(30.0)),
		material: chrome
	}

	objects = [myShip, rivalShip];

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
	console.log(event.key);
	switch (event.key) {
		case "ArrowLeft": ; break;
		case "ArrowRight": ; break;
		case "ArrowUp": ; break;
		case "ArrowDown": ; break;
	}
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


function draw() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	eye = vec3(0.0, 0.0, 0.0);

	modelViewMatrix = lookAt(eye, at, up);

	objects[0].transform = mult(modelViewMatrix, translate(0.0, -5.0, 0));

	projectionMatrix = ortho(left, right, bottom, ytop, near, far);
	gl.uniformMatrix4fv(uniformProjection, false, flatten(projectionMatrix));

	objects.forEach((obj) => {
		gl.uniformMatrix4fv(uniformModelView, false,
			flatten(mult(modelViewMatrix, obj.transform)));
		drawVertexObject(obj.vao,
			obj.indices.length,
			obj.material.ambient, obj.material.diffuse,
			obj.material.specular, obj.material.shininess);
	});

	requestAnimationFrame(draw);
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
function setUpVertexObject(shape) {
	let indices = shape.indices;
	let vertices = shape.vertices;
	let normals = shape.normals;
	//let texcoords = shape.texcoord;

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
	/*
		//set up texture buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, flatten(texcoords), gl.STATIC_DRAW);
		let texCoordLoc = gl.getAttribLocation(program, "a_texCoord");
		gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(texCoordLoc);
	*/
	//finalize the vao; not required, but considered good practice
	gl.bindVertexArray(null);

	return vao;
}


