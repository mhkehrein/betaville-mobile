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
        loadedModels = [],
        objMtlLoader = new THREE.OBJMTLLoader(),
        cameraEuler = new THREE.Euler(0, 0, 0, 'XYZ');

    function resetScene() {
        console.log('Resetting…');
        resetCamera();
    }

    function resetCamera() {
        camera.position.x = 10;
        camera.position.z = -20;
        camera.position.y = 50;
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
            yaw,
            pitch,
            roll;

        if (typeof orientation === 'undefined' || typeof location === 'undefined') {
            return;
        }

        // camera.position.x = location.coords.latitude;
        // camera.position.z = location.coords.longitude;

        /*
         * If phone lies on a flat surface, screen up, top pointing away:
         *
         *              z
         *            |
         *      y  \  |
         *          \ |
         *           \|______
         *                  x
         *
         * Angles are described as Euler angles - simplified:
         * yaw/alpha angle: Rotation around z-axis = compass direction
         * pitch/beta angle: Rotation around x-axis = front-back tilt
         * roll/gamma angle: Rotation around y-axis = left-right tilt
         *
         *  gamma x alpha
         *
         */

        pitch = THREE.Math.degToRad(orientation.do.beta); // around x-axis
        roll = THREE.Math.degToRad(orientation.do.gamma); // around y-axis
        yaw = THREE.Math.degToRad(orientation.do.alpha); // around z-axis

        console.log('degree rotation: ' + orientation.do.beta + ', ' + orientation.do.gamma + ', ' + orientation.do.alpha);

        // TODO: delete
        // $('#').html('<p>' + + '</p>');
        $('#alpha p').replaceWith('<p>' + Math.floor(orientation.do.alpha) + '</p>');
        $('#beta p').replaceWith('<p>' + Math.floor(orientation.do.beta) + '</p>');
        $('#gamma p').replaceWith('<p>' + Math.floor(orientation.do.gamma) + '</p>');

        cameraEuler.set(pitch, roll, yaw, 'XYZ');
        // camera.rotation.copy(cameraEuler);

        console.log('camera rotation: ' + camera.rotation.x + ', ' + camera.rotation.y + ', ' + camera.rotation.z + '\n' +
            'camera position: ' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z);

        camera.updateProjectionMatrix();

    }

    return {
        /**
         * given: phone on flat surface, screen up
         * alpha: around z-axis/yaw; 0(north)-359 deg, increments counter-clockwise
         * beta: x-axis/pitch; increments by tilting screen towards you
         *  --> 90° = screen towards you,
         *  --> -90° = screen away
         *  --> 180° = screen down;
         * gamma: y-axis/roll; increments clockwise till 90°
         * @param {Object} data Obtained through gyronorm.js object
         */
        setCamera: function (data) {
            var matrix = camera.projectionMatrix;

            /*
             * degree * (180 / Math.PI)
             *
             */

            var yaw = Utils.asRad(data.do.alpha);
            var pitch = Utils.asRad(data.do.beta);
            var roll = Utils.asRad(data.do.gamma);

            matrix.makeRotationX(); // beta
            matrix.makeRotationY(); // gamma
            matrix.makeRotationZ(); // alpha

            console.log('data:' + '\n' +
                data.do.alpha + '\n' + //
                data.do.beta + '\n' + // x-axis ff-
                data.do.gamma); // y c+

        },
        setCameraPosition: function (position) {
            cameraPosititon = position;
        },
        setupScene: function () {
            var
                ambient,
                directionalLight;

            console.log('setupScene');

            container = $('#container');

            // Camera
            camera = new THREE.PerspectiveCamera(80, (container.innerWidth() /
                container.innerHeight()), 1, 1000);
            resetCamera();


            // Lights
            ambient = new THREE.AmbientLight(0xffffff);
            directionalLight = new THREE.DirectionalLight(0xffffe0);
            directionalLight.position.set(80, 120, 200)
                .normalize();
            scene.add(ambient);
            scene.add(directionalLight);

            // Helper
            axisHelper = new THREE.AxisHelper(200);
            scene.add(axisHelper);

            // Renderer
            // TODO: Might have to include a transparent clearcolor
            renderer.setClearColor('#000000', 0);
            renderer.setSize(container.innerWidth(), container.innerHeight());
            // renderer.domElement = container;

            console.log(renderer);

            container.html(renderer.domElement);
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
        }
    };
}());
