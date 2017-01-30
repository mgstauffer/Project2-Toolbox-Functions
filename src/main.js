
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

    //scene.background = skymap;

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
	
	var controlPoints = [
		new THREE.Vector3( -10, 0, 0 ),
		new THREE.Vector3( -5, 2, 0 ),
		new THREE.Vector3( 0, 0, 0 )
	];
	var curve = new THREE.CatmullRomCurve3( controlPoints );

	var geometry = new THREE.Geometry();
	geometry.vertices = curve.getPoints( 50 );

	var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );

	// Create the final object to add to the scene
	var curveObject = new THREE.Line( geometry, material );
    scene.add(curveObject);
    
    //add to framework
    framework.curve = curve;
    
    //// curve -end

    // set camera position
    camera.position.set(0, 1, 5);
    camera.lookAt(new THREE.Vector3(0,0,0));

    // scene.add(lambertCube);
    scene.add(directionalLight);

    // edit params and listen to changes like this
    // more information here: https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
    gui.add(camera, 'fov', 0, 180).onChange(function(newVal) {
        camera.updateProjectionMatrix();
    });
}

// called on frame updates
function onUpdate(framework) {
	var stauff = framework.stauff;
	for( var f = 0; f < stauff.numFeathers; f ++ ){
		var feather = framework.scene.getObjectById(stauff.featherIds[f]);    

		if (feather !== undefined) {
			// Simply flap wing
			var date = new Date();
			feather.rotateZ(Math.sin(date.getTime() / 100) * 2 * Math.PI / 180);        
	
			//test
			//feather.position.set( framework.curve., framework.curveVerts[0].y, framework.curveVerts[0].z );
			var p = framework.curve.getPointAt(f / stauff.numFeathers);
			feather.position.set( p.x, p.y, p.z );
			//console.log( framework.curveVerts[0] );
			//console.log(feather.position);
		}
	}
}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);