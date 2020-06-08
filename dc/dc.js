{
    "use strict";

    const
        WIDTH = 14,
        DEPTH = 24,
        THICK = 1,
        Label = function() {
            this.initialize(arguments);
        },
        Target = function () {
            this.initialize(arguments);
        },
        FocusAnimation = function () {
            const
                duration = arguments[1] || 3000,
                target = arguments[0],
                origin = camera.position.clone(),
                distance = arguments[0].clone().sub(camera.position);
            var start;

            requestAnimationFrame(update);
            
            function update(t) {
                if (!start) {
                    start = t;
                }
    
                const elapse = t - start;
                
                if (elapse < duration) {
                    camera.position.x = origin.x + distance.x * elapse / duration;
                    camera.position.y = origin.y + distance.y * elapse / duration;
                    camera.position.z = origin.z + distance.z * elapse / duration;

                    requestAnimationFrame(update);
                } else {
                    camera.position.copy(target);
                }

                draw();
            }
        },
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        }),
        scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(60, 1, 1, 2000), // 시야각이 클수록 외곡
        controls = new THREE.OrbitControls(camera, renderer.domElement),
        intersectArray = [],
        deviceMap = {};
    let isDrag, intersect, size, target, rafID;

    Label.map = [];

    renderer.setPixelRatio(window.devicePixelRatio);

    document.body.appendChild(renderer.domElement);
    
    scene.add(camera);
    
    controls.maxPolarAngle = Math.PI /2 -0.1;
    //controls.maxPolarAngle = Math.PI /2;
    
    /*Directional light*/
    {
        const light = new THREE.DirectionalLight(0xffffff, 1);

        light.position.set(100, 100, 100);
        scene.add(light);
    }

    /*Hemisphere light*/
    {
        const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);

        light.position.set(0, 100, 0);

        scene.add(light);
    }

    /*Ground*/
    {
        new THREE.TextureLoader().load("/dc/img/floor.jpg", function (texture) {
            const floor = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshBasicMaterial({
                map: texture
            }));
        
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(100, 100);

            floor.rotation.x = Math.PI /-2;
        
            scene.add(floor);

            draw();
        });
    }

    camera.position.set(40, 20, 100);
    
    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("mousemove", onMouseMove);

    onResize();
    
    function onMouseUp(e) {
        e.preventDefault();

        const node = getIntersect();

        if (node && node === intersect && node.onclick) {
            node.onclick();
        }

        isDrag = false;
    }

    function onMouseDown(e) {
        e.preventDefault();
        
        isDrag = true;

        intersect = getIntersect();
    }

    function onMouseMove(e) {
        e.preventDefault();

        if (isDrag) {
            intersect = undefined;
        }
    }

    function getIntersect() {
        const
            raycaster = new THREE.Raycaster(),
            mouse = new THREE.Vector2();
            
        mouse.x = event.clientX / size.width *2 -1;
        mouse.y = event.clientY / size.height *-2 +1;
        
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObjects(intersectArray);
        
        if (intersects.length > 0) {
            return intersects[0].object.parent;
        }
    }

    function onResize() {
        size = document.body.getBoundingClientRect();
        
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(size.width, size.height);

        draw();
    }

    Label.prototype = {
        initialize: function (args) {
            this.device = args[0];
            this.label = document.createElement("div");

            this.label.appendChild(document.createElement("span")).textContent = args[1];
            this.label.appendChild(document.createElement("span")).textContent = args[2];
            
            this.label.className = "label";

            this.position = new THREE.Vector3(0, 0, 0);

            document.body.appendChild(this.label);

            Label.map.push(this);
        },
        update: function() {
            const box = new THREE.Box3().setFromObject(this.device);

            this.position.copy(this.device.position);
            this.position.x -= (box.max.x - box.min.x) /2;
            this.position.z += (box.max.z - box.min.z) /2;

            const position = this.position.project(camera);    

            position.x = (position.x +1) /2 * size.width;
            position.y = -(position.y -1) /2 * size.height;
            
            this.label.style.left = position.x +"px";
            this.label.style.top = position.y +"px";
        }
    };

    Target.prototype = {
        initialize: function (args) {
            this.step = args[1] || 30;
            this.target = args[0];
            this.x = (args[0].x - camera.position.x) /this.step;
            this.y = (args[0].y - camera.position.y) /this.step;
            this.z = (args[0].z - camera.position.z) /this.step;            
        },
        update: function() {
            if (this.step-- > 1) {
                camera.position.x += this.x;
                camera.position.y += this.y;
                camera.position.z += this.z;
            } else if (this.step === 0) {
                camera.position.copy(this.target);
            }
        }
    };

    function draw() {
        controls.update();

        renderer.render(scene, camera);

        Label.map.forEach(label => label.update());
    }

    function play() {
        draw();

        rafID = window.requestAnimationFrame(play);
    }

    function stop() {
        if (rafID) {
            window.cancelAnimationFrame(rafID);

            rafID = undefined;
        }
    }

    function createDevice (id, args) {
        const
            device = new THREE.Group(),
            model = args.model? new THREE.Mesh(
            new THREE.BoxBufferGeometry(WIDTH, args.model.unit, DEPTH),
            [
                new THREE.MeshBasicMaterial(),
                new THREE.MeshBasicMaterial(),
                new THREE.MeshBasicMaterial(),
                new THREE.MeshBasicMaterial(),
                new THREE.MeshBasicMaterial({
                    map: args.model.front
                }),
                new THREE.MeshBasicMaterial({
                    map: args.model.rear
                })
            ]):
            new THREE.Mesh(
                new THREE.BoxBufferGeometry(WIDTH, 1, DEPTH),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color(0xc0c0c0)
                })
            );

        if (args.labels) {
            new Label(device, args.labels[0], args.labels[1]);
        }

        if (args.status) {
            const marker = new THREE.Mesh(new THREE.BoxBufferGeometry(WIDTH +3, args.model.unit -0.2, DEPTH +1), new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0.5
            }))
            
            switch(args.status) {
            case "shutdown":
                marker.material.color = new THREE.Color("#ff0000");

                break;
            case "critical":
                marker.material.color = new THREE.Color("#ff5a00");

                break;
            }

            device.add(marker);
        }

        intersectArray.push(model);
        
        deviceMap[id] = device;

        device.onclick = args.onclick;
        
        device.add(model);

        return device;
    }

    function createRack (texture, size, x, y) {
        const
            rack = new THREE.Group(),
            sideGeo = new THREE.BoxBufferGeometry(THICK, size, DEPTH);
            planeGeo = new THREE.BoxBufferGeometry(WIDTH + THICK *2, THICK, DEPTH),
            
            mat = new THREE.MeshPhongMaterial({
                color: new THREE.Color(0x333333)
            }),
            sideMat = new THREE.MeshPhongMaterial({
                map: texture
            }),
            right = new THREE.Mesh(sideGeo, [sideMat, sideMat, mat, mat, mat, mat]),
            left = new THREE.Mesh(sideGeo, [sideMat, sideMat, mat, mat, mat, mat]),
            plane = new THREE.Mesh(planeGeo, mat);

        right.position.set((WIDTH + THICK) /2, size /2 + THICK, 0);
        left.position.set((WIDTH + THICK) /-2, size /2 + THICK, 0);
        plane.position.set(0, THICK /2, 0);

        rack.add(right);
        rack.add(left);
        rack.add(plane);

        plane = new THREE.Mesh(planeGeo, mat);

        plane.position.set(0, size + THICK *3/2, 0);

        rack.add(plane);

        rack.position.x = x;
        rack.position.z = y;

        scene.add(rack);

        return rack;
    }

    function animateFocus(t) {
        
        camera.updateMatrixWorld();

        if (target.update()) {
            draw();

            requestAnimationFrame(animateFocus);
        }
    }

    /**
     * 
     * @param {string} id
     */
    function focusDevice (id) {
        const device = deviceMap[id];

        if (device) {
            const v = new THREE.Vector3().copy(device.position);

            controls.target.copy(device.position);
            
            v.z += DEPTH;

            new FocusAnimation(v);
        }
    }

    function putDevice(rack, device, pos) {
        if (!rack) {console.log("Rack not found.");
            return;
        }

        const
            rBox = new THREE.Box3().setFromObject(rack),
            rMax = rBox.max,
            rMin = rBox.min,
            sBox = new THREE.Box3().setFromObject(device),
            sMax = sBox.max,
            sMin = sBox.min;
    
        device.position.set((rMax.x + rMin.x) /2, rMin.y + THICK + pos -1 + (sMax.y - sMin.y) /2, (rMax.z + rMin.z) /2);

        scene.add(device);
    };
}