/**
 * Contains references to camera, scene and renderer, prepares and builds WebGL elements.
 * Singleton.
 *
 * @class
 */
var Graphics = (function () {
    'use strict';

    var
        scene = new THREE.Scene(),
        camera,
        renderer = new THREE.WebGLRenderer({
            alpha: true
        }),
        container,
        axisHelper,
        camHelper,
        ambientLight,
        directionalLight,
    loadedModels = [],
        objMtlLoader = new THREE.OBJMTLLoader(),
        cameraEuler = new THREE.Euler(0, 0, 0, 'XYZ'),
        scenePreparedDeferred = $.Deferred();

    function resetScene() {
        console.log('Resetting…');
        resetCamera();
    }

    function resetCamera() {
        camera.position.x = 5;
        camera.position.y = 15;
        camera.position.z = 100;
        camera.lookAt(scene.position);

        camera.updateProjectionMatrix();
    }

    function render() {
        if ($('#container').is(':visible')) {

            setCameraPosition();
            requestAnimationFrame(render);
            renderer.render(scene, camera, null, true);
        }
    }

    function loadModels(origin) {
        var
            modelsList = ViewerData.getModels();

        $.each(modelsList, function (index, model) {
            objMtlLoader.load(model.objBlobUrl, model.mtlBlobUrl, function (obj_3d) {
                    obj_3d.position.x = Utils.distanceWestEast(origin, model.centerPoint);
                    // Workaround: Z-position needs to be inverted, reason unknown
                    obj_3d.position.z = -1 * Utils.distanceSouthNorth(origin, model.centerPoint);
                    obj_3d.position.y = 0;

                    obj_3d.rotateY(Math.round(model.orientation[1]) * (Math.PI / 180));

                    obj_3d.scale.set(model.scale[0], model.scale[1], model.scale[2]);

                    scene.add(obj_3d);
                },
                function (xmlHttpRequest) {
                    // empty onProgress
                },
                function (error) {
                    alert('Error while loading model: A file may be corrupt.');
                    console.warn(error);
                }
            );
        });
    }

    function setCameraPosition() {
        var
            orientation = Sensors.getOrientation(),
            location = Sensors.getLocation(),
            alphaAdjusted,
            yaw,
            pitch,
            roll;

        if (typeof orientation === 'undefined' || typeof location === 'undefined') {
            return;
        }



        // camera.position.x = location.coords.latitude;
        // camera.position.z = location.coords.longitude;

        var alpha = orientation.do.alpha;
        var beta = orientation.do.beta;
        var gamma = orientation.do.gamma;

        //      angles as radians
        pitch = 0 //orientation.pitch; // beta, around x-axis, as rad
        roll = orientation.roll; // gamma, around y-axis
        yaw = orientation.yaw; // alpha, around z-axis

        $('#alpha p').replaceWith('<p>' + Math.floor(alpha) + '</p>');
        $('#beta p').replaceWith('<p>' + Math.floor(beta) + '</p>');
        $('#gamma p').replaceWith('<p>' + Math.floor(gamma) + '</p>');
        $('#grav-y p').replaceWith('<p>' + Math.floor(orientation.dm.gy) + '</p>');

        cameraEuler.set(pitch, roll, yaw, 'XZY');
        // camera.setRotationFromEuler(cameraEuler);

        // TODO: Delete
        var dir = camera.getWorldDirection();

        // console.log('camera rotation: ' + camera.rotation.x + ', ' + camera.rotation.y + ', ' + camera.rotation.z + '\n' +
        // 'camera position: ' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z);
        // axisHelper.position.x = dir.x;
        // axisHelper.position.y = dir.y;

        console.log('cam dir');
        console.log(dir.x * -100 + ', ' + dir.y * -100 + ', ' + dir.z * -100);

        console.log('cam pos');
        console.log(camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z);
        console.log('axis');
        console.log(axisHelper.position.x + ', ' + axisHelper.position.y + ', ' + axisHelper.position.z);

        camera.updateProjectionMatrix();
    }

    return {
        init: function () {
            console.log('setupScene');

            container = $('#container');

            console.log(container.innerWidth() + ' ' + container.innerHeight());
            // Camera
            camera = new THREE.PerspectiveCamera(80, (container.innerWidth() /
                container.innerHeight()), 0.1, 10000);
            resetCamera();


            // Lights
            ambientLight = new THREE.AmbientLight(0xffffff);
            directionalLight = new THREE.DirectionalLight(0xffffe0);
            directionalLight.position.set(80, 120, 200)
                .normalize();
            scene.add(ambientLight);
            scene.add(directionalLight);

            // Helper
            axisHelper = new THREE.AxisHelper(2000);
            scene.add(axisHelper);

            // camera.lookAt(axisHelper.position);

            // Renderer
            // TODO: Might have to include a transparent clearcolor
            renderer.setClearColor('#000000', 0.5);
            // renderer.setSize(container.innerWidth(), container.innerHeight());
            // renderer.domElement = container;

            console.log(renderer);

            container.html(renderer.domElement);
            scenePreparedDeferred.resolve();
        },
        getRenderer: function () {
            return renderer;
        },
        resetScene: function () {
            resetScene();
        },
        adjustCamera: function () {
            var ratio;

            container = $('#container');
            ratio = container.innerWidth() / container.innerHeight();

            camera.ratio = ratio;
            camera.updateProjectionMatrix();
        },
        renderScene: function () {
            render();
        },
        setRendererSize: function (width, height) {
            renderer.setSize(width, height);
        },
        load: function (origin) {
            loadModels(origin);
        },
        scenePreparedDeferred: function () {
            return scenePreparedDeferred;
        }
    };
}());
