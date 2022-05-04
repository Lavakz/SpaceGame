"use strict";

///////////////////////////////////////////////////////////////////////////
//3D drawing; Modified from webgl2fundamentals.org

//Modified from webgl2fundamentals.org
function createSphereVertices(
    radius,
    subdivisionsAxis,
    subdivisionsHeight,
    opt_startLatitudeInRadians,
    opt_endLatitudeInRadians,
    opt_startLongitudeInRadians,
    opt_endLongitudeInRadians) {
        
    if (subdivisionsAxis <= 0 || subdivisionsHeight <= 0) {
        throw new Error('subdivisionAxis and subdivisionHeight must be > 0');
    }

    opt_startLatitudeInRadians = opt_startLatitudeInRadians || 0;
    opt_endLatitudeInRadians = opt_endLatitudeInRadians || Math.PI;
    opt_startLongitudeInRadians = opt_startLongitudeInRadians || 0;
    opt_endLongitudeInRadians = opt_endLongitudeInRadians || (Math.PI * 2);

    let latRange = opt_endLatitudeInRadians - opt_startLatitudeInRadians;
    let longRange = opt_endLongitudeInRadians - opt_startLongitudeInRadians;

    // We are going to generate our sphere by iterating through its
    // spherical coordinates and generating 2 triangles for each quad on a
    // ring of the sphere.
    let numVertices = (subdivisionsAxis + 1) * (subdivisionsHeight + 1);
    let positions = [];
    let normals   = [];
    let texcoords = [];

    // Generate the individual vertices in our vertex buffer.
    for (let y = 0; y <= subdivisionsHeight; y++) {
        for (let x = 0; x <= subdivisionsAxis; x++) {
          // Generate a vertex based on its spherical coordinates
          let u = x / subdivisionsAxis;
          let v = y / subdivisionsHeight;
          let theta = longRange * u + opt_startLongitudeInRadians;
          let phi = latRange * v + opt_startLatitudeInRadians;
          let sinTheta = Math.sin(theta);
          let cosTheta = Math.cos(theta);
          let sinPhi = Math.sin(phi);
          let cosPhi = Math.cos(phi);
          let ux = cosTheta * sinPhi;
          let uy = cosPhi;
          let uz = sinTheta * sinPhi;
          
          positions.push(vec3(radius * ux, radius * uy, radius * uz));
          normals.push(vec3(ux, uy, uz));
          texcoords.push(vec2(1 - u, v));
        }
    }

    let numVertsAround = subdivisionsAxis + 1;
    let indices = [];
    for (let x = 0; x < subdivisionsAxis; x++) {    
        for (let y = 0; y < subdivisionsHeight; y++) {      
          // Make triangle 1 of quad.
          indices.push((y + 0) * numVertsAround + x);
          indices.push((y + 0) * numVertsAround + x + 1);
          indices.push((y + 1) * numVertsAround + x);

          // Make triangle 2 of quad.
          indices.push((y + 1) * numVertsAround + x);
          indices.push((y + 0) * numVertsAround + x + 1);
          indices.push((y + 1) * numVertsAround + x + 1);
        }
    }

    return {
        vertices: positions,
        normals: normals,
        texcoord: texcoords,
        indices: indices,
    };
    
}

//Modified from webgl2fundamentals.org
function createTruncatedConeVertices(
    bottomRadius,
    topRadius,
    height,
    radialSubdivisions,
    verticalSubdivisions,
    opt_topCap,
    opt_bottomCap) {
        
    if (radialSubdivisions < 3) {
        throw new Error('radialSubdivisions must be 3 or greater');
    }

    if (verticalSubdivisions < 1) {
        throw new Error('verticalSubdivisions must be 1 or greater');
    }

    let topCap = (opt_topCap === undefined) ? true : opt_topCap;
    let bottomCap = (opt_bottomCap === undefined) ? true : opt_bottomCap;

    let extra = (topCap ? 2 : 0) + (bottomCap ? 2 : 0);

    let numVertices = (radialSubdivisions + 1) * (verticalSubdivisions + 1 + extra);
    let positions = [];
    let normals   = [];
    let texcoords = [];
    let indices   = [];

    let vertsAroundEdge = radialSubdivisions + 1;

    // The slant of the cone is constant across its surface
    let slant = Math.atan2(bottomRadius - topRadius, height);
    let cosSlant = Math.cos(slant);
    let sinSlant = Math.sin(slant);

    let start = topCap ? -2 : 0;
    let end = verticalSubdivisions + (bottomCap ? 2 : 0);

    for (let yy = start; yy <= end; ++yy) {
        let v = yy / verticalSubdivisions;
        let y = height * v;
        let ringRadius;
        
        if (yy < 0) {
            y = 0;
            v = 1;
            ringRadius = bottomRadius;
        } else if (yy > verticalSubdivisions) {
            y = height;
            v = 1;
            ringRadius = topRadius;
        } else {
            ringRadius = bottomRadius +
                (topRadius - bottomRadius) * (yy / verticalSubdivisions);
        }
        
        if (yy === -2 || yy === verticalSubdivisions + 2) {
          ringRadius = 0;
          v = 0;
        }
        y -= height / 2;
        for (let ii = 0; ii < vertsAroundEdge; ++ii) {
            let sin = Math.sin(ii * Math.PI * 2 / radialSubdivisions);
            let cos = Math.cos(ii * Math.PI * 2 / radialSubdivisions);
            positions.push(vec3(sin * ringRadius, y, cos * ringRadius));
            if (yy < 0) {
                normals.push(vec3(0, -1, 0));
            } else if (yy > verticalSubdivisions) {
                normals.push(vec3(0, 1, 0));
            } else if (ringRadius === 0.0) {
                normals.push(vec3(0, 0, 0));
            } else {
                normals.push(vec3(sin * cosSlant, sinSlant, cos * cosSlant));
            }
            texcoords.push(vec2((ii / radialSubdivisions), 1 - v));
        }
    }

    for (let yy = 0; yy < verticalSubdivisions + extra; ++yy) {  
        for (let ii = 0; ii < radialSubdivisions; ++ii) {  
            indices.push(vertsAroundEdge * (yy + 0) + 0 + ii);
            indices.push(vertsAroundEdge * (yy + 0) + 1 + ii);
            indices.push(vertsAroundEdge * (yy + 1) + 1 + ii);
            indices.push(vertsAroundEdge * (yy + 0) + 0 + ii);
            indices.push(vertsAroundEdge * (yy + 1) + 1 + ii);
            indices.push(vertsAroundEdge * (yy + 1) + 0 + ii);
        }
    }
    
    return {
        vertices: positions,
        normals: normals,
        texcoord: texcoords,
        indices: indices,
    };
    
}

//Modified from webgl2fundamentals.org
function createCubeVertices(size) {
    size = size || 1;
    let k = size / 2;

    let CUBE_FACE_INDICES= [
      [3, 7, 5, 1], // right
      [6, 2, 0, 4], // left
      [6, 7, 3, 2], // ??
      [0, 1, 5, 4], // ??
      [7, 6, 4, 5], // front
      [2, 3, 1, 0]  // back
    ];

    let cornerVertices = [
        [-k, -k, -k],
        [+k, -k, -k],
        [-k, +k, -k],
        [+k, +k, -k],
        [-k, -k, +k],
        [+k, -k, +k],
        [-k, +k, +k],
        [+k, +k, +k],
    ];

    let faceNormals = [
        [+1, +0, +0],
        [-1, +0, +0],
        [+0, +1, +0],
        [+0, -1, +0],
        [+0, +0, +1],
        [+0, +0, -1],
    ];

    let uvCoords = [
        [1, 0],
        [0, 0],
        [0, 1],
        [1, 1],
    ];

    let numVertices = 6 * 4;
    let positions = [];
    let normals   = [];
    let texcoords = [];
    let indices   = [];

    for (let f = 0; f < 6; ++f) {
        let faceIndices = CUBE_FACE_INDICES[f];
        for (let v = 0; v < 4; ++v) {
            let position=vec3(cornerVertices[faceIndices[v]] );
            let normal = faceNormals[f];
            let uv = uvCoords[v];

            // Each face needs all four vertices because the normals and texture
            // coordinates are not all the same.
            positions.push(position);
            normals.push(normal);
            texcoords.push(uv);

        }
        // Two triangles make a square face.
        let offset = 4 * f;
        indices.push(offset + 0, offset + 1, offset + 2);
        indices.push(offset + 0, offset + 2, offset + 3);
    }

    return {
        positions: positions,
        normals: normals,
        texcoord: texcoords,
        indices: indices,
    };
}


// This function tries to guess what the appropriate viewing
// parameters should be based on the overall values of the
// coordinates
//Used for mesh objects
function setViewParams(vertices) {
    let xmin = Infinity;
    let xmax = -Infinity;
    let ymin = Infinity;
    let ymax = -Infinity;
    let zmin = Infinity;
    let zmax = -Infinity;
    for (let i = 0; i < vertices.length; i = i + 3) {
        if (vertices[i] < xmin)
            xmin = vertices[i];
        else if (vertices[i] > xmax)
            xmax = vertices[i];
        if (vertices[i+1] < ymin)
            ymin = vertices[i+1];
        else if (vertices[i+1] > ymax)
            ymax = vertices[i+1];
        if (vertices[i+2] < zmin)
            zmin = vertices[i+2];
        else if (vertices[i+2] > zmax)
            zmax = vertices[i+2];
    }

    /* translate the center of the object to the origin */
    let centerX = (xmin+xmax)/2;
    let centerY = (ymin+ymax)/2; 
    let centerZ = (zmin+zmax)/2;
    let max = Math.max(centerX - xmin, xmax - centerX);
    max = Math.max(max, Math.max(centerY - ymin, ymax - centerY) );
    max = Math.max(max, Math.max(centerZ - zmin, zmax - centerZ) );
    let margin = max * 0.2;
    left = -(max+margin);
    right = max+margin;
    bottom = -(max+margin);
    ytop = max+margin;
    far = -(max+margin);
    near = max+margin;
    radius = max + margin;
}

function print(name, mv, is2D) {
    console.log(name + ":\n");
    let str = "";
    if (is2D){
      for (let i=0; i<mv.length; i++){
        for (let j=0; j<mv[i].length; j++)
            str += parseFloat(String(mv[i][j])).toFixed(2)+", ";
        str += "\n";
      }  
    }
    else{
        str = "[ ";
        for (let i=0; i<mv.length-1; i++)
            str += parseFloat(String(mv[i])).toFixed(2)+", ";
        str += parseFloat(String(mv[mv.length-1])).toFixed(2)+" ]\n";       
    }
    console.log(str);
}
