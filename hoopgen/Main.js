function main()
{

    WHEEL = new Wheel();

    initGUI();
    initScene();
    initLights();

    animate();
    testHtmlLoad("./instructions/sheldon.html");
}

function cleanMesh(dMesh){
    scene.remove(dMesh);
    dMesh.geometry.dispose();
    dMesh.material.dispose();
}


function initScene()
{
    // Creates the scene and set the scene size.

    var WIDTH = (window.innerWidth * 0.62) - 3;
    var HEIGHT = window.innerHeight;

    wheelUI.style.height = HEIGHT - 5;

    wheelRenderer.style.width = WIDTH;
    wheelRenderer.style.height = HEIGHT;

    scene = new THREE.Scene();

    // Creates renderer and add it to the DOM.
    renderer = new THREE.WebGLRenderer({antialias:false});
    renderer.setSize(WIDTH, HEIGHT);
    wheelRenderer.appendChild(renderer.domElement);
    //document.body.appendChild(renderer.domElement);

    // Creates camera, zooms out from the model a bit, and adds it to the scene.
    camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.05, 10000);
    camera.position.set(0,0,1200)
    scene.add(camera);

    // Creates event listener that resizes the renderer with the browser window.
    window.addEventListener('resize', function()
    {
        var WIDTH = (window.innerWidth * 0.62) - 3 ;
        var HEIGHT = window.innerHeight;

        wheelUI.style.height = HEIGHT - 5;

        wheelRenderer.style.width = WIDTH;
        wheelRenderer.style.height = HEIGHT;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    });

    // Set the background color of the scene.

    renderer.setClearColor(0x083045);   //dark blue-ish
    // Add OrbitControls so that we can pan around with the mouse.
    controls = new THREE.OrbitControls(camera, renderer.domElement);
}

// Add lighting to scene
function initLights()
{
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight.position.set( -400, 400, 400 );
    scene.add( directionalLight );

    var directionalLight2 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight2.position.set( 400, 400, -400  );
    scene.add( directionalLight2 );
    var light = new THREE.AmbientLight( 0xcccccc); // soft white light
    scene.add( light );
}

//initGUI is it's own .js file

//updates the scene
function animate()
{
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();

    WHEEL.update();
}

function testHtmlLoad(htmldoc){

    var wheelUI = document.getElementById('wheelUI');

    var xhr= new XMLHttpRequest();
    xhr.open('GET', htmldoc, true);
    xhr.onreadystatechange= function() {
        if (this.readyState!==4) return;
        if (this.status!==200) return; // or whatever error handling you want
        wheelUI.innerHTML= this.responseText;
    };
    xhr.send();

}

