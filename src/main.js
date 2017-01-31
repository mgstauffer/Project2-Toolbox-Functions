
// Skybox texture from: https://github.com/mrdoob/three.js/tree/master/examples/textures/cube/skybox

const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'

// called after the scene loads
function onLoad(framework) {
    var scene = framework.scene;
    var camera = framework.camera;
    var renderer = framework.renderer;
    var gui = framework.gui;
    var stats = framework.stats;
	var stauff = framework.stauff;
	
    // Basic Lambert white
    var lambertWhite = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });

    // Set light
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
    directionalLight.color.setHSL(0.1, 1, 0.95);
    directionalLight.position.set(1, 3, 2);
    directionalLight.position.multiplyScalar(10);

    // set skybox background
    var loader = new THREE.CubeTextureLoader();
    var urlPrefix = '/images/skymap/';

    var skymap = new THREE.CubeTextureLoader().load([
        urlPrefix + 'px.jpg', urlPrefix + 'nx.jpg',
        urlPrefix + 'py.jpg', urlPrefix + 'ny.jpg',
        urlPrefix + 'pz.jpg', urlPrefix + 'nz.jpg'
    ] );

    scene.background = skymap;

    // load a simple obj mesh
    var objLoader = new THREE.OBJLoader();
    objLoader.load('/geo/feather.obj', function(obj) {

        // LOOK: This function runs after the obj has finished loading
        var featherGeo = obj.children[0].geometry;

		for( var f = 0; f < stauff.numFeathers; f++ ){
	        var featherMesh = new THREE.Mesh(featherGeo, lambertWhite);
    	    featherMesh.name = "feather" + featherMesh.id;
    	    stauff.featherIds.push(featherMesh.id);
        	scene.add(featherMesh);
        }
    });

	//// curve
	stauff.curveUp = new THREE.CatmullRomCurve3( stauff.controlPointsUp );
	stauff.curveDown = new THREE.CatmullRomCurve3( stauff.controlPointsDown )
	
	var curve = new THREE.CatmullRomCurve3( stauff.controlPointsUp );
	var geometry = new THREE.Geometry();
	geometry.vertices = stauff.curveUp.getPoints( 50 );

	var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );

	// Create the final object to add to the scene if we want to see it
	var curveObject = new THREE.Line( geometry, material );
    //scene.add(curveObject);
    
    //// curve -end

    // set camera position
    camera.position.set(7, 7, 5);
    camera.lookAt(new THREE.Vector3(0,0,5));

    // scene.add(lambertCube);
    scene.add(directionalLight);

    // edit params and listen to changes like this
    // more information here: https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
    gui.add(camera, 'fov', 0, 180).onChange(function(newVal) {
        camera.updateProjectionMatrix();
    });
}

///// tweening

function lerp( v0, v1, t ){
  return (1 - t) * v0 + t * v1;
} 

function powerlerp( v0, v1, t, exp ){
  t = Math.pow( t, exp );
  return (1 - t) * v0 + t * v1;
} 

function triangle( t ){
  if( t < 0.5 )
    return t * 2;
  return ( 1 - t ) * 2;
}

function smootherstep( x ){
  return 6 * Math.pow(x, 5) - 15 * Math.pow(x, 4) + 10 * Math.pow(x, 3);
}

/////

// called on frame updates
function onUpdate(framework) {
	var stauff = framework.stauff; //**NOTE** this is ref assignment, not a copy
	var date = new Date();

	//Determine the curve for this frame
	//Interpolate control points for up and down positions of wing
	var period = 3000; //milliseconds for full up/down cycle
	var phase = triangle( ( date.getTime() % period ) / period ); //getTime returns msec since 1970
	phase = smootherstep( phase );
	var pointsInterp = []; //can't simply assign stauff.curveUp to get right size, cuz it'll be a ref and not a separte object
	for( var v = 0; v < stauff.controlPointsUp.length; v++ ){
	  pointsInterp.push( new THREE.Vector3() )
	  for (var i = 0; i < 3; i++)
	    pointsInterp[v].setComponent(i, lerp( stauff.controlPointsUp[v].getComponent(i), stauff.controlPointsDown[v].getComponent(i), phase ) );
	    //console.log('pI: ', pointsInterp[v]);
	}
	var curveInterp = new THREE.CatmullRomCurve3( pointsInterp );
	
	//Draw the feathers
	for( var f = 0; f < stauff.numFeathers; f ++ ){
		var feather = framework.scene.getObjectById(stauff.featherIds[f]);    

		if (feather !== undefined) {
			// Simply flap wing
			//feather.rotateY( 1 * Math.PI / 180 ); //*increments* rotation

			//Get the feather's position along the spine/curve
			var curveStep = Math.pow(f / (stauff.numFeathers - 1), 1.1);
			var p = curveInterp.getPointAt( curveStep );
			feather.position.set( p.x, p.y, p.z );
			
			//first align along x
			var axis = new THREE.Vector3(0,1,0);
			var angleDeg = 0;
			feather.setRotationFromAxisAngle( axis, angleDeg * Math.PI / 180 ); //sets fixed rotation

			//Find the home orientation of feather so that it's always
			// aligned with surface of the wing
			//Assuming that the wing's neutral/flat position is in xz-plane, then normal
			// along spine of wing is along +y
			//
			//get the tangent along the curve at this feather's attachment point
			var tangent = curveInterp.getTangentAt( curveStep ); //unit length
			//cross with the tangent in neutral position (0,1,0) to get angle and axis of its rotation into new curve
			// orientation. Empirically, the tangent along a straight-line curve along +z axis is positive
			var tangent0 = new THREE.Vector3(0,0,1); //unit length
			var cross = new THREE.Vector3();
			cross.crossVectors( tangent0, tangent ); //is this t0 x t, or t x t0?
			var angle = Math.asin( cross.length() );
			//rotate feather into plane of wing surface
			feather.rotateOnAxis( cross.normalize(), angle );

			//rotate furthest feathers outwards
			//
			//rotate the neutral position normal around the cross product vector to
			// get the new normal orientation
			var norm = new THREE.Vector3(0,1,0);
			norm.applyAxisAngle( norm, angle );
			var maxAngleRad = -90 * Math.PI / 180;
			//rotate the feather around the normal 
			var rotAngle = powerlerp( 0, maxAngleRad, curveStep, 3.5 );
			feather.rotateOnAxis( norm.normalize(), rotAngle );
			
		}
	}
}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);