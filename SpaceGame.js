"use strict";

let canvas;
let gl;

let near = 1;
let far = 2000;

let eye = vec3(2, 2, 2);
let up = vec3(0.0, 1.0, 0.0);

let uniformModelView, uniformProjection;
let modelViewMatrix, projectionMatrix;

let lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
let lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
let lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
let lightPosition = vec4(-1000.0, 0.0, 0.0, 0.0);
let thrusterPosition = vec4(0.0, 0.0, 0.0, 0.0);

let program;
let objects;

let texture;

let theta = 0.0;
let direction = vec3(0, 0, -1);
let tiltDegrees = 0.0;

let timer;
let delay = 750;

let difficulty = 100;

let allRings = [];
let currentRingIndex = -1;

let endGame = false;
let userWon;

// Materials
const chromeMaterial = {
	ambient: vec4(0.25, 0.25, 0.25, 1.0),
	diffuse: vec4(0.4, 0.4, 0.4, 1.0),
	specular: vec4(0.77, 0.77, 0.77, 1.0),
	shininess: 0.6
};

const gold = {
	ambient: vec4(0.24725, 0.1995, 0.0745, 1.0),
	diffuse: vec4(0.75164, 0.60648, 0.22648, 1.0),
	specular: vec4(0.628281, 0.555802, 0.366065, 1.0),
	shininess: 0.4
};

const jade = {
	ambient: vec4(0.135, 0.2225, 0.1575, 1.0),
	diffuse: vec4(0.54, 0.89, 0.63, 1.0),
	specular: vec4(0.316228, 0.316228, 0.316228, 1.0),
	shininess: 0.6
};

// Shapes
const spaceshipMesh = {
	vertices: myMesh.vertices[0].values,
	indices: myMesh.connectivity[0].indices,
	normals: myMesh.vertices[1].values,
	texcoord: null
};

const ringMesh = {
	vertices: myRing.vertices[0].values,
	indices: myRing.connectivity[0].indices,
	normals: myRing.vertices[1].values
};

const finishLineMesh = {
	vertices: finishLine.vertices[0].values,
	indices: finishLine.connectivity[0].indices,
	normals: finishLine.vertices[1].values,
	texcoord: finishLine.vertices[3].values
};

// questions to answer:
//   - does the rival spaceship's speed change (random speed throughout)?
//   - how does your spaceship's speed change?
//   - can you move around planets and other objects?
//   - how is the race path determined?

function init() {
	document.onkeydown = function (ev) {
		if (ev.code === "Space") {
			document.getElementById("rules").hidden = true;
			document.getElementById("timer").hidden = false;

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

			// Objects
			spaceshipMesh.texcoord = createSphereVertices(10.0, 45.0, 45.0).texcoord; 
			const myShip = {
				vao: setUpVertexObject(spaceshipMesh, true),
				indices: spaceshipMesh.indices,
				transform() {
					let eyePos = getEyePosition(modelViewMatrix);
					let shipTransform = translate(eyePos[0], eyePos[1], eyePos[2]);
					thrusterPosition = vec4(eyePos[0], eyePos[1]-5, eyePos[2]-30, 0.0);
					shipTransform = mult(shipTransform, rotateZ(tiltDegrees));
					shipTransform = mult(shipTransform, translate(0, -5, -40));
					shipTransform = mult(shipTransform, rotateX(-theta));
					shipTransform = mult(shipTransform, rotateY(180));
					return shipTransform;
				},
				material: chromeMaterial,
				textured: 0.0,
				speed: 1.9
			};

			let v;
			const planet1 = {
				vertices: v = createSphereVertices(170.0, 45.0, 45.0),
				vao: setUpVertexObject(v, true),
				indices: v.indices,
				transform() { return translate(300.0, 200.0, -1300); },
				material: gold,
				textured: 2.0
			};

			const ring = {
				vao: setUpVertexObject(ringMesh),
				indices: ringMesh.indices,
				transform() {
					let ringTransform = mult(scalem(2, 2, 2), rotateY(90));
					ringTransform = mult(translate(0.0, -3.0, -500.0), ringTransform);
					return ringTransform;
				},
				material: gold,
				textured: -1.0
			};
			allRings.push(ring);

			objects = [myShip, planet1, ring];
			determineRacePath(ring);

			const finishLine = {
				vao: setUpVertexObject(finishLineMesh, true),
				indices: finishLineMesh.indices,
				transform() {
					let lastRingTransform = allRings[allRings.length - 1].transform();
					return mult(
						translate(
							lastRingTransform[0][3],
							lastRingTransform[1][3],
							lastRingTransform[2][3] - 500
						),
						mult(
							rotateY(90),
							scalem(1, 1.2, 2)
						)
					);
				},
				material: chromeMaterial,
				textured: 1.0	// textured with finish-line texture
			};

			let rivalTransform = translate(10, 0, -250);
			let rivalDirection = vec3(0, 0, -1);
			let rivalRingNum = 0;
			const rival = {
				vao: setUpVertexObject(spaceshipMesh),
				indices: spaceshipMesh.indices,
				transform() {
					rivalTransform = mult(rivalTransform, translate(rivalDirection));
					if (hasCollided(rivalTransform, allRings[rivalRingNum].transform(), 50, 50)) {
						if (rivalRingNum !== allRings.length - 1) {
							rivalRingNum++;
							let targetTransform = allRings[rivalRingNum].transform();
							rivalDirection = updateRivalPath(targetTransform, rivalTransform);
						}
					} else if (rivalRingNum === allRings.length - 1) {
						let targetTransform = objects[objects.length - 1].transform();
						rivalDirection = updateRivalPath(targetTransform, rivalTransform);
						if (hasCollided(rivalTransform, objects[objects.length - 1].transform(), 80, 60)) {			// rival has won
							endGame = true;
							userWon = false;
						}
					}
					//rivalTransform = mult(rivalTransform, rotateY(180));
					return rivalTransform;
				},
				material: chromeMaterial,
				textured: 0.0
			};

			objects.push(rival);
			objects.push(finishLine);

			// Initialize textures
			// -1: no texture, 0: ships, 1: goal, >2: planets
			let shipImage = new Image();
			shipImage.src = document.getElementById("shipTexture").src;
			shipImage.onload = function () {configureTexture(shipImage, 0);}

			let planetImage = new Image();
			planetImage.src = document.getElementById("volcanoPlanetTex").src;
			planetImage.onload = function () {configureTexture(planetImage, 2);}

			let finishLineImage = new Image();
			finishLineImage.src = document.getElementById("finishLineTex").src;
			finishLineImage.onload = function () {
				configureTexture(finishLineImage, 1);
			}

			document.onkeydown = function (ev) { keyHandler(ev, true); };
			document.onkeyup = function (ev) { keyHandler(ev, false); };

			timer = setTimeout(updateTimer, delay);

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
	}
}

let input = [0, 0]
function keyHandler(event, isDown) {
	switch (event.key) {
		case "w": case "W": input[0] = (isDown ? 1 : 0); break;
		case "s": case "S": input[0] = (isDown ? -1 : 0); break;
		case "d": case "D": input[1] = (isDown ? 1 : 0); break;
		case "a": case "A": input[1] = (isDown ? -1 : 0); break;
	}
}

function tilt(degrees) {
	tiltDegrees -= degrees;
	up = vec3(-Math.sin(radians(tiltDegrees)),
		Math.cos(radians(tiltDegrees)),
		up[2]);
	turn(0); //update direction
}

function turn(t) {
	theta -= t;
	direction = multM3V3(modelViewMatrix, vec3(0,
		Math.sin(radians(theta)),
		-Math.cos(radians(theta))));
}

function updateRivalPath(targetTransform, rivalTransform) {
	let target = vec3(targetTransform[0][3],
		targetTransform[1][3],
		targetTransform[2][3]);
	let position = vec3(rivalTransform[0][3],
		rivalTransform[1][3],
		rivalTransform[2][3]);
	target[0] += (Math.random() * 10) - 5;
	target[1] += (Math.random() * 10) - 5;
	return scale(2.0, normalize(subtract(target, position)));
}

// randomly generates the race path outlined by ring objects
function determineRacePath(ringObject) {
	let lastRing = allRings[0];
	for (let count = 0; count < 2; count++) {	// path of 10 rings
		let previousTransformation = lastRing.transform();
		let newX = previousTransformation[0][3] + (Math.random() * difficulty);
		let newY = previousTransformation[0][3] + (Math.random() * difficulty);
		let newZ = previousTransformation[2][3] - 500;

		let newRing = {
			vao: ringObject.vao,
			indices: ringObject.indices,
			transform() {
				let ringTransform = mult(scalem(2, 2, 2), rotateY(90));
				ringTransform = mult(translate(newX, newY, newZ), ringTransform);
				return ringTransform;
			},
			material: ringObject.material,
			textured: ringObject.textured
		};

		objects.push(newRing);
		allRings.push(newRing);
		lastRing = newRing;
	}
}

// checks if the user has passed through a ring
function checkIfInRing() {
	let ringTransform = allRings[currentRingIndex + 1].transform();
	let shipTransform = objects[0].transform();

	if (hasCollided(shipTransform, ringTransform, 50, 50)) {
		currentRingIndex++;
		objects[0].speed += 0.2;
		allRings[currentRingIndex].material = jade;
	}
}

// checks if user has passed through the finish line
function checkIfInFinishLine() {
	let finishLineTransform = objects[objects.length - 1].transform();
	let shipTransform = objects[0].transform();

	if (hasCollided(shipTransform, finishLineTransform, 80, 60)) {
		endGame = true;
		userWon = true;
	}
}

// checks if ship has passed through an object
function hasCollided(shipTransform, objectTransform, xPixels, yPixels) {
	let zDifference = shipTransform[2][3] - objectTransform[2][3];
	if (zDifference >= -2 && zDifference <= 2) { // within 2 z pixels of center of ring
		let xDifference = shipTransform[0][3] - objectTransform[0][3];
		if (xDifference >= -xPixels && xDifference <= xPixels) { // within 50 x pixels of center of ring
			let yDifference = shipTransform[1][3] - objectTransform[1][3];
			if (yDifference >= -yPixels && yDifference <= yPixels) { // within 50 y pixels of center of ring
				return true;	// collided with object

			}
		}
	}

	return false; // didn't collide with object
}

// updates the timer by adding one second to the counter
function updateTimer() {
	if (endGame) {			// reached the end of the game, stop the clock
		clearTimeout(timer);
	} else {
		let dt = Date.now() - (Date.now() + delay);
		let timer = document.getElementById("timer");
		let seconds = timer.innerHTML.substring(3);
		let minutes = timer.innerHTML.substring(0, 2);

		if (parseInt(seconds) + 1 === 60) {			// reach 60 seconds
			let newMinutes = parseInt(minutes) + 1;
			minutes = newMinutes.toString();

			if (minutes.length === 1) {
				minutes = "0" + minutes;
			}

			seconds = "00";
		} else {									// add one to second counter
			let newSeconds = parseInt(seconds) + 1;
			seconds = newSeconds.toString();

			if (seconds.length === 1) {
				seconds = "0" + seconds;
			}
		}

		timer.innerHTML = minutes + ":" + seconds;
		setTimeout(updateTimer, Math.max(0, delay - dt));
	}
}

function draw() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	projectionMatrix = perspective(30.0, gl.canvas.width / gl.canvas.height, near, far);
	gl.uniformMatrix4fv(uniformProjection, false, flatten(projectionMatrix));

	// move eye in direction
	eye = add(eye, vec3(direction[0] * objects[0].speed,
		-direction[1] * objects[0].speed,
		direction[2] * objects[0].speed));

	// make move according to input[]
	if (input[0] == 1) { turn(2); }
	else if (input[0] == -1) { turn(-2); }
	if (input[1] == 1) { tilt(3); }
	else if (input[1] == -1) { tilt(-3); }

	modelViewMatrix = lookAtGT(eye, vec3(0, 0, 1), up);//modified lookAtGT to remove at

	objects.forEach((obj) => {
		gl.uniform1f(gl.getUniformLocation(program, "textured"), obj.textured);
		if (obj.textured !== -1.0)
			gl.uniform1i(gl.getUniformLocation(program, "u_textureMap"), obj.textured);
		gl.uniformMatrix4fv(uniformModelView, false,
			flatten(mult(modelViewMatrix, obj.transform())));
		drawVertexObject(obj.vao,
			obj.indices.length,
			obj.material.ambient, obj.material.diffuse,
			obj.material.specular, obj.material.shininess);
	});

	if (currentRingIndex !== allRings.length - 1)
		checkIfInRing();
	else
		checkIfInFinishLine();

	if (!endGame)
		requestAnimationFrame(draw);
	else {
		document.getElementById("finish").hidden = false;
		let userTime = document.getElementById("timer").innerHTML;
		document.getElementById("user-time").innerHTML = "Time: " + userTime;
		document.getElementById("who-won").hidden = false;
		document.getElementById("timer").hidden = true;

		if (userWon) {
			document.getElementById("who-won").innerHTML = "You won!";
			document.getElementById("user-time").hidden = false;
		} else {
			document.getElementById("who-won").innerHTML = "You lost";
		}
	}
}