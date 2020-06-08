{
    "use strict";

    const
        SVG_NS_URI = "http://www.w3.org/2000/svg",
        XLINK_NS_URI = "http://www.w3.org/1999/xlink",
        ICON_SIZE = 40,
        TEXT_TRIM = 20;

    const
        root = document.createElementNS(SVG_NS_URI, "svg"),
        container = document.createElementNS(SVG_NS_URI, "g"),
        transform = {
            resize: container.transform.baseVal.appendItem(root.createSVGTransform()),
            scale: container.transform.baseVal.appendItem(root.createSVGTransform()),
            translate: container.transform.baseVal.appendItem(root.createSVGTransform())
        },
        layerMap = {
            path: document.createElementNS(SVG_NS_URI, "g"),
            device: document.createElementNS(SVG_NS_URI, "g")
        },
        deviceArray = [],
        deviceMap = {};
    let
        scale = 1,
        intersect, size, dragOrigin;

    document.body.appendChild(root);
    
    for (let name in layerMap) {
        container.appendChild(layerMap[name]);
    }
    
    root.appendChild(container);
    
    window.addEventListener("resize", onResize);

    root.addEventListener("wheel", onScale);
    root.addEventListener("mousedown", onMouseDown);
    root.addEventListener("mouseup", onMouseUp);
    root.addEventListener("mousemove", onMouseMove);
    root.addEventListener("contextmenu", e => e.preventDefault());

    onResize();

    function onScale (e) {
        if (e.deltaY < 0) {
            scale *= 1.1;
        } else {
            scale /= 1.1;
        }

        transform.scale.setScale(scale, scale);
    }

    function onMouseUp(e) {
        e.preventDefault();

        if (e.which !== 1) {
            return;
        }

        const device = getIntersect(e);
        
        if (intersect && (device === intersect)) {
            device.dispatchEvent(new Event("_click"));
        }

        dragOrigin = undefined;
    }

    function onMouseDown(e) {
        e.preventDefault();
        
        if (e.which !== 1) {
            return;
        }
        
        dragOrigin = {
            e: transform.translate.matrix.e,
            f: transform.translate.matrix.f,
            x: e.clientX,
            y: e.clientY
        };

        intersect = getIntersect(e);
    }

    function onMouseMove(e) {
        e.preventDefault();

        if (dragOrigin) {
            intersect = undefined;

            transform.translate.setTranslate(dragOrigin.e + (e.clientX - dragOrigin.x) / scale, dragOrigin.f + (e.clientY - dragOrigin.y) / scale);
        }
    }

    function getIntersect(e) {
        if (e.target !== e.currentTarget) {
            return e.target;
        }
    }

    function onResize() {
        size = document.body.getBoundingClientRect();
        
        transform.resize.setTranslate(size.width /2, size.height /2);
    }

    window.render = function () {      
        const delta = clock.getDelta();
    
        animation(delta);

        requestAnimationFrame(render);
    }

    function animation(delta) {
    }

    window.addDevice = function (args) {
        const
            node = args.node,
            icon = args.icon,
            pos = args.position,
            svgDevice = document.createElementNS(SVG_NS_URI, "g"),
            svgIcon = document.createElementNS(SVG_NS_URI, "image"),
            svgLabel = document.createElementNS(SVG_NS_URI, "text"),
            svgAddr = document.createElementNS(SVG_NS_URI, "tspan"),
            svgName = document.createElementNS(SVG_NS_URI, "tspan"),
            svgBG = document.createElementNS(SVG_NS_URI, "circle"),
            size = args.size || ICON_SIZE;

        svgIcon.setAttribute("x", -size /2);
        svgIcon.setAttribute("y", -size /2);
        svgIcon.setAttribute("width", size +"px");
        svgIcon.setAttribute("height", size +"px");
        
        svgDevice.setAttribute("transform", "translate("+ pos.x +","+ pos.y +")");
        
        svgBG.setAttribute("r", size * Math.sin(Math.PI /4));
        svgBG.setAttribute("cx", 0);
        svgBG.setAttribute("cy", 0);

        svgDevice.dataset.id = node.id;

        if (icon.group === "group") {
            svgDevice.classList.add("group");
        }
        else if (node.protocol) {
//            svgDevice.onmouseenter = onMouseOver;
        }

        if (args.click) {
            svgIcon.addEventListener("_click", args.click);
        }

        if (args.hover) {
            svgIcon.onmouseenter = args.hover;
        }
        
        svgName.textContent = node.name || node.ip || "";
        svgAddr.textContent = node.ip || node.name || "";
        
        svgLabel.appendChild(svgName);
        svgLabel.appendChild(svgAddr);
        
        svgLabel.setAttribute("x", 0);
        svgLabel.setAttribute("y", size);
        svgLabel.setAttribute("dominant-baseline", "top");

        svgDevice.appendChild(svgIcon);
        svgDevice.appendChild(svgLabel);
        svgDevice.appendChild(svgBG);
        
        svgDevice.classList.add("node");
        
        layerMap.device.appendChild(svgDevice);
        
        if ("protocol" in node) {
            if ("status" in node && !node.status) {
                svgIcon.setAttributeNS(XLINK_NS_URI, "xlink:href", icon.shutdown || icon.src);
            } else {
                svgIcon.setAttributeNS(XLINK_NS_URI, "xlink:href", icon.src);
            }
        }
        else if (icon.group === "group") {
            svgIcon.setAttributeNS(XLINK_NS_URI, "xlink:href", icon.src);
        }
        else {
            svgIcon.setAttributeNS(XLINK_NS_URI, "xlink:href", icon.disabled);
        }
        
        deviceArray.push(svgDevice);

        deviceMap[String(node.id)] = svgDevice;

        layerMap.device.appendChild(svgDevice);

        return svgDevice;
    };

    /**
    맵 상에 peer가 존재하거나 하위 그룹에 존재하면 Path
    상위에 존재하면 Uplink
    **/
    window.addPath = function (args) {
        const
            nodeFrom = args.nodeFrom,
            nodeTo = args.nodeTo,
            labelFrom = args.labelFrom,
            labelTo = args.labelTo,
            option = args.option,
            svgPath = document.createElementNS(SVG_NS_URI, "g"),
            svgLine = document.createElementNS(SVG_NS_URI, "polyline");
        var x, y;

        svgPath.classList.add("path");

        svgLine.setAttribute("stroke", option.color);
        svgLine.setAttribute("stroke-width", option.size);

        svgPath.appendChild(svgLine);

        if (args.posFrom && args.posTo) {
            const
                x1 = args.posFrom.x,
                y1 = args.posFrom.y;

            x = args.posTo.x - x1;
            y = args.posTo.y - y1;

            switch (option.type) {
            case "clock":
                svgLine.setAttribute("points", `0,0 ${x},0 ${x},${y}`);

                break;
            case "counter":
                svgLine.setAttribute("points", `0,0 0,${y} ${x},${y}`);

                break;
            default:
                svgLine.setAttribute("points", `0,0 ${x},${y}`);
            }

            svgPath.setAttribute("transform", "translate("+ x1 +","+ y1 +")");
        } else {
            const
                pos = args.posFrom || args.posTo,
                peer = document.createElementNS(SVG_NS_URI, "circle");
            
            x = 0;
            y = -100;

            svgLine.setAttribute("points", `0,0 ${x},${y}`);

            svgPath.setAttribute("transform", `translate(${pos.x},${pos.y})`);

            peer.setAttribute("cx", x);
            peer.setAttribute("cy", y);
            peer.setAttribute("r", 10);

            svgPath.appendChild(peer);
        }

        if (labelFrom) {
            const text = document.createElementNS(SVG_NS_URI, "text");
            let tspan;

            svgPath.appendChild(text);

            switch(option.type) {
                case "clock":
                    text.setAttribute("x", x /2);
                    text.setAttribute("y", 0);

                    break;
                case "counter":
                    text.setAttribute("x", 0);
                    text.setAttribute("y", y /2);

                    break;
                default:
                    text.setAttribute("x", x /3);
                    text.setAttribute("y", y /3);
            }

            labelFrom.forEach(label => {
                tspan = document.createElementNS(SVG_NS_URI, "tspan");

                tspan.textContent = " "+ (label.name.length >= TEXT_TRIM?
                    label.name.substring(0, TEXT_TRIM) +"...":
                    label.name) +" ";

                if (label.click) {
                    tspan.onclick = e => label.click(nodeFrom, label.index);
                }

                text.appendChild(tspan);
            });
        }

        if (labelTo) {
            const text = document.createElementNS(SVG_NS_URI, "text");
            let tspan;

            svgPath.appendChild(text);

            switch(option.type) {
                case "clock":
                    text.setAttribute("x", x);
                    text.setAttribute("y", y /2);

                    break;
                case "counter":
                    text.setAttribute("x", x /2);
                    text.setAttribute("y", y);

                    break;
                default:
                    text.setAttribute("x", x *2/3);
                    text.setAttribute("y", y *2/3);
            }
            
            labelTo.forEach(label => {
                tspan = document.createElementNS(SVG_NS_URI, "tspan");

                tspan.textContent = " "+ (label.name.length >= TEXT_TRIM?
                    label.name.substring(0, TEXT_TRIM) +"...":
                    label.name) +" ";
                
                if (label.click) {
                    tspan.onclick = e => label.click(nodeTo, label.index);
                }

                text.appendChild(tspan);
            });
        }

        layerMap.path.appendChild(svgPath);

        return svgPath;
    };

    window.setStatus = function (id, status) {
        const device = deviceMap[id];

        if (device) {
            if (!device.querySelector("circle")) {
                const status = document.createElementNS(SVG_NS_URI, "circle");

                status.setAttribute("r", window.OFFSET_C);
	            status.setAttribute("cx", 0);
                status.setAttribute("cy", 0);
                
                device.appendChild();
            }

            device.classList.add(status);
        }
    };

    window.focusDevice = function (id) {
        const device = deviceMap[id];

        if (device) {
            const matrix = device.transform.baseVal.getItem(0).matrix;

            transform.translate.setTranslate(-matrix.e, -matrix.f);

            scale = 0;

            let start;

            const animation = t => {
                if (isNaN(start)) {
                    start = t;
                }
                else {
                    scale = Math.min(1, (t - start) /1000) *3;
        
                    transform.scale.setScale(scale, scale);
        
                    if (scale >= 3) {
                        return;
                    }
                }
        
                requestAnimationFrame(animation);
            };
        
            animation();
        }
    };

    window.createTitle = function () {
        return document.createElementNS(SVG_NS_URI, "title");
    }
}