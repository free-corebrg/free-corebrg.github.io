{
    "use strict";

    const
        SVG_NS_URI = "http://www.w3.org/2000/svg",
        XLINK_NS_URI = "http://www.w3.org/1999/xlink",
        ICON_SIZE = 40,
        TEXT_TRIM = 20,
        PATH_WIDTH = 0.5,
        PATH_COLOR = "#fff";
    
    const
        root = document.body.querySelector("svg"),
        container = document.getElementById("container"),
        selector = document.getElementById("selector"),
        transform = {
            resize: container.transform.baseVal.appendItem(root.createSVGTransform()),
            scale: container.transform.baseVal.appendItem(root.createSVGTransform()),
            translate: container.transform.baseVal.appendItem(root.createSVGTransform())
        },
        layerMap = {
            path: document.getElementById("path"),
            link: document.getElementById("link"),
            device: document.getElementById("node"),
            select: document.getElementById("select")
        },
        linkHelper = layerMap.link.querySelector("polyline"),
        positionMap = {},
        deviceMap = {},
        testMap = {};

    let
        scale = 1,
        size, mouseDown, linkStart, timer;

    window.addEventListener("resize", onResize);

    root.addEventListener("wheel", onScale);
    root.addEventListener("mousedown", onMouseDown);
    root.addEventListener("mouseup", onMouseUp);
    root.addEventListener("mousemove", onMouseMove);
    root.addEventListener("contextmenu", onMenu);

    onResize();

    function onScale (e) {
        if (e.deltaY < 0) {
            scale *= 1.1;
        } else {
            scale /= 1.1;
        }

        transform.scale.setScale(scale, scale);
    }

    function onResize() {
        size = document.body.getBoundingClientRect();
        
        transform.resize.setTranslate(size.width /2, size.height /2);
    }

    function onMenu(e) {
        e.preventDefault();

        if (e.target !== this) {
            const device = e.target.parentNode;

            onSelect(Number(device.dataset.id), device.classList.contains("group"));
        }
    }

    function onMouseDown(e) {
        e.preventDefault();

        if (e.which !== 1) {
            return;
        }

        mouseDown = {
            origin: e.target,
            x: e.clientX,
            y: e.clientY,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey
        };
        
        if (e.target !== this) {
            const device = e.target.parentNode;
            
            if (device.classList.contains("group")) {
                timer = setTimeout(function () {
                    mouseDown = undefined;
        
                    onEnter(Number(device.dataset.id));
                }, 600);
            }
        }
    }

    function onMouseMove(e) {
        e.preventDefault();

        clearTimeout(timer);

        if (linkStart) {
            if (e.target === this) {
                linkHelper.setAttribute("points", `0,0 ${(e.clientX - linkStart.x) / scale},${(e.clientY - linkStart.y) / scale}`);
                
                document.body.classList.remove("match");
            } else {
                const
                    device = e.target.parentNode;

                if (!device.classList.contains("group")) {
                    const
                        matrixFrom = linkStart.origin.parentNode.transform.baseVal.getItem(0).matrix,
                        matrixTo = device.transform.baseVal.getItem(0).matrix;

                    linkHelper.setAttribute("points", `0,0 ${matrixTo.e - matrixFrom.e},${matrixTo.f - matrixFrom.f}`);

                    document.body.classList.add("match");
                } else {
                    linkHelper.setAttribute("points", `0,0 ${(e.clientX - linkStart.x) / scale},${(e.clientY - linkStart.y) / scale}`);

                    document.body.classList.remove("match");
                }           
            }
        } else if (mouseDown) {
            //DragStart
            if (!mouseDown.drag) {
                if (mouseDown.shiftKey || mouseDown.ctrlKey) {
                    mouseDown.origin = this;

                    const matrix = selector.transform.baseVal.getItem(0).matrix;
                    
                    matrix.e = mouseDown.x;
                    matrix.f = mouseDown.y;
                }

                if (mouseDown.origin !== this) {
                    const device = mouseDown.origin.parentNode;

                    if (device.parentNode !== layerMap.select) {
                        mouseDown.origin = this;
                    }
                }

                mouseDown.drag = true;
            }
            
            //DragMove
            if (mouseDown.origin === this) {
                if (mouseDown.shiftKey || mouseDown.ctrlKey) {//DragSelect
                    const
                        matrix = selector.transform.baseVal.getItem(0).matrix;
                    
                    matrix.a = e.clientX - mouseDown.x;
                    matrix.d = e.clientY - mouseDown.y;
                } else {//DragAll
                    transform.translate.setTranslate(Math.round((e.clientX - mouseDown.x) / scale /10) *10, Math.round((e.clientY - mouseDown.y) / scale /10)*10);
                }
            } else {//DragSelected
                document.body.classList.add("drag");

                const
                    x = Math.round((e.clientX - mouseDown.x) / scale /10) *10,
                    y = Math.round((e.clientY - mouseDown.y) / scale /10) *10;

                [].forEach.call(layerMap.select.querySelectorAll("g"), device => {
                    const matrix = device.transform.baseVal.getItem(1).matrix;

                    matrix.e = x;
                    matrix.f = y;

                    drawPath(device.dataset.id);
                });            
            }
        }
    }

    function onMouseUp(e) {
        e.preventDefault();

        if (e.which !== 1 || !mouseDown) {
            return;
        }

        clearTimeout(timer);

        //DragEnd
        if (mouseDown.drag) {
            if (mouseDown.origin === this) {//DragEndSelect
                if (mouseDown.shiftKey || mouseDown.ctrlKey) {
                    const matrix = selector.transform.baseVal.getItem(0).matrix;
                    let x1, y1, x2, y2;

                    x1 = (matrix.e - size.width /2) /scale;
                    y1 = (matrix.f - size.height /2) /scale;
            
                    if (matrix.a < 0) {
                        x2 = x1;
                        x1 = x1 + matrix.a / scale;
                    }
                    else {
                        x2 = x1 + matrix.a / scale;
                    }
                    
                    if (matrix.d < 0) {
                        y2 = y1;
                        y1 = y1 + matrix.d / scale;
                    }
                    else {
                        y2 = y1 + matrix.d / scale;
                    }

                    if (mouseDown.shiftKey) {
                        const layer = layerMap.select;

                        [].forEach.call(layerMap.device.querySelectorAll("g"), device => {
                            const matrix = device.transform.baseVal.getItem(0).matrix;

                            if (x1 <= matrix.e && x2 >= matrix.e && y1 <= matrix.f && y2 >= matrix.f) {
                                layer.appendChild(device);
                            }
                        });
                    } else {
                        const
                            df = document.createDocumentFragment(),
                            layer = layerMap.device;

                        [].forEach.call(layerMap.device.querySelectorAll("g"), device => {
                            const matrix = device.transform.baseVal.getItem(0).matrix;

                            if (x1 <= matrix.e && x2 >= matrix.e && y1 <= matrix.f && y2 >= matrix.f) {
                                df.appendChild(device);
                            }
                        });

                        [].forEach.call(layerMap.select.querySelectorAll("g"), device => {
                            const matrix = device.transform.baseVal.getItem(0).matrix;

                            if (x1 <= matrix.e && x2 >= matrix.e && y1 <= matrix.f && y2 >= matrix.f) {
                                layer.appendChild(device);
                            }
                        });

                        layerMap.select.appendChild(df);
                    }

                    matrix.a = 0;
                    matrix.d = 0;    
                } else {//DragEndAll
                    const
                        matrix = transform.translate.matrix,
                        x = matrix.e,
                        y = matrix.f;

                    [layerMap.device, layerMap.select].forEach(layer => 
                        [].forEach.call(layer.querySelectorAll("g"), device => {
                            const
                                id = device.dataset.id,
                                matrix = device.transform.baseVal.getItem(0).matrix,
                                pos = positionMap[id];

                            pos.x = matrix.e += x;
                            pos.y = matrix.f += y;

                            drawPath(id);
                        }));

                    transform.translate.setTranslate(0, 0);
                }
            } else {//DragEndSelected
                [].forEach.call(layerMap.select.querySelectorAll("g"), device => {
                    const
                        id = device.dataset.id,
                        transform = device.transform.baseVal,
                        matrix0 = transform.getItem(0).matrix,
                        matrix1 = transform.getItem(1).matrix,
                        pos = positionMap[id];

                    pos.x = matrix0.e += matrix1.e;
                    pos.y = matrix0.f += matrix1.f;

                    matrix1.e = 0;
                    matrix1.f = 0;

                    drawPath(id);

                    if (e.target !== this) {
                        const device = e.target.parentNode;
                        
                        if (device.classList.contains("group")) {
                            const id = device.dataset.id && Number(device.dataset.id) || undefined;

                            [].forEach.call(layerMap.select.querySelectorAll("g"), device => {
                                positionMap[device.dataset.id].parent = id;
                            });
                        
                            onEnter(id);
                        }
                    }
                });

                document.body.classList.remove("drag");
            }
        //Click
        } else {
            if (linkStart) {
                linkHelper.removeAttribute("points");

                if (e.target !== this) {
                    const device = e.target.parentNode;

                    if (!device.classList.contains("group")) {
                        onLink(Number(linkStart.origin.parentNode.dataset.id), Number(e.target.parentNode.dataset.id));
                    }
                }
    
                linkStart = undefined;

                document.body.classList.remove("link");
            }
            else if (mouseDown.origin === this) {
                [].forEach.call(layerMap.select.querySelectorAll("g"), device => layerMap.device.appendChild(device));
            } else {
                const device = mouseDown.origin.parentNode;

                if (mouseDown.shiftKey) {
                    layerMap.select.appendChild(device);
                } else if (mouseDown.ctrlKey) {
                    if (device.parentNode === layerMap.device) {
                        layerMap.select.appendChild(device);
                    } else {
                        layerMap.device.appendChild(device);
                    }
                } else if (mouseDown.altKey && !device.classList.contains("group")) {
                    const matrix = device.transform.baseVal.getItem(0).matrix;

                    layerMap.link.setAttribute("transform", `translate(${matrix.e},${matrix.f})`);

                    linkStart = {
                        origin: mouseDown.origin,
                        x: e.clientX,
                        y: e.clientY
                    };

                    document.body.classList.add("link");
                } else {
                    [].forEach.call(layerMap.select.querySelectorAll("g"), device => layerMap.device.appendChild(device));

                    layerMap.select.appendChild(device);
                }
            }
        }

        mouseDown = undefined;
    }

    function createDevice(args) {
        const
            device = document.createElementNS(SVG_NS_URI, "g"),
            svgIcon = document.createElementNS(SVG_NS_URI, "image"),
            svgBG = document.createElementNS(SVG_NS_URI, "circle"),
            svgLabel = document.createElementNS(SVG_NS_URI, "text"),
            svgAddr = document.createElementNS(SVG_NS_URI, "tspan"),
            svgName = document.createElementNS(SVG_NS_URI, "tspan"),
            pos = {
                x: Math.round(args.pos.x /10) *10,
                y: Math.round(args.pos.y /10) *10
            },
            size = args.size || ICON_SIZE;
        
        positionMap[args.id] = args.pos;

        svgIcon.setAttribute("x", size *-1 /2);
        svgIcon.setAttribute("y", size *-1 /2);
        svgIcon.setAttribute("width", size +"px");
        svgIcon.setAttribute("height", size +"px");

        svgBG.setAttribute("r", size * Math.sin(Math.PI /4));
        svgBG.setAttribute("cx", 0);
        svgBG.setAttribute("cy", 0);

        device.setAttribute("transform", `translate(${pos.x},${pos.y }) translate(0,0)`);
        
        device.dataset.id = args.id;

        if (args.group) {
            device.classList.add("group");
        }
        
        svgName.textContent = args.name;
        svgAddr.textContent = args.ip;
        
        svgLabel.appendChild(svgName);
        svgLabel.appendChild(svgAddr);
        
        svgLabel.setAttribute("x", 0);
        svgLabel.setAttribute("y", size);
        svgLabel.setAttribute("dominant-baseline", "top");
        
        device.appendChild(svgBG);
        device.appendChild(svgIcon);
        device.appendChild(svgLabel);
        
        svgIcon.setAttributeNS(XLINK_NS_URI, "xlink:href", args.icon);

        layerMap.device.appendChild(device);

        deviceMap[args.id] = device;

        return device;
    }

    function createPath(args) {
        const
            path = document.createElementNS(SVG_NS_URI, "g"),
            line = document.createElementNS(SVG_NS_URI, "polyline"),
            labelFrom = [],
            labelTo = [],
            pathData = {
                from: args.from,
                to: args.to,
                type: args.path.type
            };
        
        line.setAttribute("stroke", args.path.color || PATH_COLOR);
        line.setAttribute("stroke-width", args.path.size || PATH_WIDTH);

        path.appendChild(line);

        pathData.path = path;
        pathData.line = line;

        if (typeof args.links === typeof []) {
            args.links.forEach(link => {
                if (link.indexFrom) {
                    const tspan = document.createElementNS(SVG_NS_URI, "tspan");

                    tspan.textContent = " "+ (link.indexFromName.length >= TEXT_TRIM?
                        link.indexFromName.substring(0, TEXT_TRIM) +"...":
                        link.indexFromName) +" ";

                    labelFrom.push(tspan);
                }
                
                if (link.indexTo) {
                    const tspan = document.createElementNS(SVG_NS_URI, "tspan");

                    tspan.textContent = " "+ (link.indexToName.length >= TEXT_TRIM?
                        link.indexToName.substring(0, TEXT_TRIM) +"...":
                        link.indexToName) +" ";

                    labelTo.push(tspan);
                }
            });
        }

        if (labelFrom.length > 0) {
            const label = document.createElementNS(SVG_NS_URI, "text");

            labelFrom.forEach(tspan => label.appendChild(tspan));

            pathData.labelFrom = label;

            path.appendChild(label);
        }

        if (labelTo.length > 0) {
            const label = document.createElementNS(SVG_NS_URI, "text");

            labelTo.forEach(tspan => label.appendChild(tspan));

            pathData.labelTo = label;

            path.appendChild(label);
        }

        if (args.from) {
            let array = testMap[args.from];

            if (!array) {
                array = testMap[args.from] = [];
            }

            array.push(pathData);

            drawEachPath(pathData);
        }

        if (args.to) {
            let array = testMap[args.to];

            if (!array) {
                array = testMap[args.to] = [];
            }

            array.push(pathData);

            drawEachPath(pathData);
        }

        layerMap.path.appendChild(path);
    }

    function drawPath (id) {
        const pathArray = testMap[id];

        if (pathArray) {
            pathArray.forEach(pathData => drawEachPath(pathData));
        }
    }

    function drawEachPath (pathData) {
        if (!pathData.from) {
            return drawEachPathTo(pathData);
        } else if (!pathData.to) {
            return drawEachPathFrom(pathData);
        }

        const
            transformFrom = deviceMap[pathData.from].transform.baseVal,
            matrixFrom0 = transformFrom.getItem(0).matrix,
            matrixFrom1 = transformFrom.getItem(1).matrix,
            xFrom = matrixFrom0.e + matrixFrom1.e,
            yFrom = matrixFrom0.f + matrixFrom1.f,
            transformTo = deviceMap[pathData.to].transform.baseVal,
            matrixTo0 = transformTo.getItem(0).matrix,
            matrixTo1 = transformTo.getItem(1).matrix,
            x = matrixTo0.e + matrixTo1.e - xFrom,
            y = matrixTo0.f + matrixTo1.f - yFrom;
        
        pathData.path.setAttribute("transform", `translate(${xFrom},${yFrom})`);
        
        switch (pathData.type) {
        case "clock":
            pathData.line.setAttribute("points", `0,0 ${x},0 ${x},${y}`);

            if (pathData.labelFrom) {
                pathData.labelFrom.setAttribute("x", x /2);
                pathData.labelFrom.setAttribute("y", 0);
            }

            if (pathData.labelTo) {
                pathData.labelTo.setAttribute("x", x);
                pathData.labelTo.setAttribute("y", y /2);
            }

            break;
        case "counter":
            pathData.line.setAttribute("points", `0,0 0,${y} ${x},${y}`);

            if (pathData.labelFrom) {
                pathData.labelFrom.setAttribute("x", 0);
                pathData.labelFrom.setAttribute("y", y /2);
            }

            if (pathData.labelTo) {
                pathData.labelTo.setAttribute("x", x /2);
                pathData.labelTo.setAttribute("y", y);
            }

            break;
        default:
            pathData.line.setAttribute("points", `0,0 ${x},${y}`);

            if (pathData.labelFrom) {
                pathData.labelFrom.setAttribute("x", x /3);
                pathData.labelFrom.setAttribute("y", y /3);
            }

            if (pathData.labelTo) {
                pathData.labelTo.setAttribute("x", x *2 /3);
                pathData.labelTo.setAttribute("y", y *2 /3);
            }
        }
    }

    function drawEachPathFrom (pathData) {
        const
            transformFrom = deviceMap[pathData.from].transform.baseVal,
            matrixFrom0 = transformFrom.getItem(0).matrix,
            matrixFrom1 = transformFrom.getItem(1).matrix,
            xFrom = matrixFrom0.e + matrixFrom1.e,
            yFrom = matrixFrom0.f + matrixFrom1.f;

        if (pathData.labelTo) {
            pathData.labelTo.setAttribute("x", 0);
            pathData.labelTo.setAttribute("y", -100 *2 /3);
        }

        if (pathData.labelFrom) {
            pathData.labelFrom.setAttribute("x", 0);
            pathData.labelFrom.setAttribute("y", -100 /3);
        }

        pathData.path.setAttribute("transform", `translate(${xFrom},${yFrom})`);
        
        pathData.line.setAttribute("points", "0,0 0,-100");
    }

    function drawEachPathTo (pathData) {
        const
            transformFrom = deviceMap[pathData.to].transform.baseVal,
            matrixFrom0 = transformFrom.getItem(0).matrix,
            matrixFrom1 = transformFrom.getItem(1).matrix,
            xFrom = matrixFrom0.e + matrixFrom1.e,
            yFrom = matrixFrom0.f + matrixFrom1.f;
            
        if (pathData.labelTo) {
            pathData.labelTo.setAttribute("x", 0);
            pathData.labelTo.setAttribute("y", -100 /3);
        }

        if (pathData.labelFrom) {
            pathData.labelFrom.setAttribute("x", 0);
            pathData.labelFrom.setAttribute("y", -100 *2 /3);
        }

        pathData.path.setAttribute("transform", `translate(${xFrom},${yFrom})`);

        pathData.line.setAttribute("points", "0,0 0,-100");
    }
}