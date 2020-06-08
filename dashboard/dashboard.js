{
    "use strict";

    Chart.defaults.global.defaultFontColor = "#efefef";
    Chart.defaults.global.defaultFontFamily = "'맑은 고딕', 'Arial', 'Tahoma'";

    const
        sConfig = {
            data: {
                datasets: [{
                    data: [],
                    backgroundColor: ["rgb(142, 36, 170)", "rgb(246, 191, 38)", "rgb(0, 137, 123)"],
                    borderWidth: 0
                }],
                labels: ["장애", "임계", "정상"]
            },
            options: {
                legend: {
                    display: false
                },
                scale: {
                    ticks: {
                        min: -20,
                        backdropColor: "rgba(0, 0, 0, 0)"
                    },
                    gridLines: {
                        lineWidth: 1,
                        color: "rgba(200, 200, 200, 0.5)"
                    }
                },
                plugins: {
                    labels: [{
                        render: "label",
                        position: "outside",
                        fontSize: 14,
                        fontStyle: "bold"
                    }, {
                        render: "percentage",
                        fontColor: "#efefef",
                        precision: 2
                    }]
                },
                responsive: false
            }
        },
        lConfig = {
            type: "radar",
            data: {
                datasets: [{
                    label: "장애",
                    backgroundColor: Chart.helpers.color("#c23b23").alpha(0.2).rgbString(),
                    borderColor: "#c23b23",
                    pointBackgroundColor: "#c23b23"
                }, {
                    label: "임계",
                    backgroundColor: Chart.helpers.color("#f39a27").alpha(0.2).rgbString(),
                    borderColor: "#f39a27",
                    pointBackgroundColor: "#f39a27"
                }, {
                    label: "정상",
                    backgroundColor: Chart.helpers.color("#03c03c").alpha(0.2).rgbString(),
                    borderColor: "#03c03c",
                    pointBackgroundColor: "#03c03c"
                }]
            },
            options: {
                legend: {
                    display: false
                },
                scale: {
                    pointLabels: {
                        fontSize: 14,
                        fontStyle: "bold"
                    },
                    gridLines: {
                        lineWidth: 1,
                        color: "rgba(200, 200, 200, 0.5)"
                    },
                    ticks: {
                        stepSize: 1,
                        backdropColor: "rgba(0, 0, 0, 0)"
                    }
                },
                responsive: false,
            }
        },
        sChart = new Chart.PolarArea(document.getElementById("chart").getContext("2d"), sConfig),
        lChart = new Chart(document.getElementById("label").getContext("2d"), lConfig);


    function updateChart(normal, critical, shutdown, min) {
        const labels = [], sData = [], cData = [], nData = [];
        var count;

        for (let label in $.labelMap) {
            labels.push(label);
    
            count = $.labelMap[label];
    
            sData.push(count.shutdown);
            cData.push(count.critical);
            nData.push(count.normal);
        }

        sConfig.data.datasets[0].data = [shutdown, critical, normal];
        sConfig.options.scale.ticks.min = min;

        sChart.update();

        lConfig.data.labels = labels;
        lConfig.data.datasets[0].data = sData;
        lConfig.data.datasets[1].data = cData;
        lConfig.data.datasets[2].data = nData;

        lChart.update();
    }

    function setTop(section, topArray) {
        const list = section.querySelector(".list");

        for (let item; item=list.firstChild; ) {
            list.removeChild(item);
        }

        if (!topArray || topArray.legend === 0) {
            section.classList.add("empty");

            return;
        }

        if (topArray) {
            topArray.forEach(value => {
                if (Number(value.value) || !section.dataset.zero) {
                    list.appendChild(createTopItem(value, window[section.dataset.func], section.dataset.chart));
                }
            });
        }

        if (list.children.length === 0) {
            section.classList.add("empty");
        }
    }

    function toErrorString(value) {
        return value;
    }
    
    function toMillsString(value) {
        return value +"ms";
    }
    
    function toPercentageString(value) {
        return value +"%";
    }
    
    function toBytesString(bytes) {
        var unit = ["Bytes", "KBytes", "MBytes", "GBytes", "TBytes"];
        
        for(var i=0, _i=unit.length -1; i<_i; i++) {
            if (bytes > 999) {
                bytes /= 1024;
            }
            else {
                break;
            }
        }
        
        return bytes.toFixed(2) + unit[i];
    }
            
    function toBPSString(bandwidth) {
        if (isNaN(bandwidth)) {
            return "0bps";
        }
        
        var unit = ["bps", "Kbps", "Mbps", "Gbps", "Tbps"];
        
        for(var i=0, _i=unit.length -1; i<_i; i++) {
            if (bandwidth > 999) {
                bandwidth /= 1000;
            }
            else {
                break;
            }
        }
        
        return bandwidth.toFixed(2) + unit[i];
    }

    function createTopItem(value, toString, chart) {
        const 
            base = $.nodeData[value.id],
            item = document.createElement("ul"),
            gauge = document.createElement("li");
    
        item.appendChild(document.createElement("li")).textContent = base.name || base.ip;
        item.appendChild(document.createElement("li")).textContent = base.ip;
        item.appendChild(gauge);
        
        gauge.dataset.value = toString(Number(value.value));
                
        gauge.appendChild(document.createElement("div")).style.left = value.rate +"%";
        
        if (value.rate > -1) {
            item.title = toPercentageString(value.rate);
        }
        
        item.onclick = function () {
            window.sessionStorage.setItem("node_id", value.id);
    
            //parent.location.href = "/resource.html";
        };
        
        gauge.onclick = function (e) {
            e.stopPropagation();
            
            window.sessionStorage.setItem("node_id", value.id);
            window.sessionStorage.setItem("chart", chart);
            window.sessionStorage.setItem("index", value.index);
        
            //parent.location.href = "/chart/chart.html";
        };
        
        return item;
    }

    function getTop() {
        $.request.execute({
            command: "get",
            target: "top",
            count: 10
        }, function () {
            switch (this.status) {
            case 200:
                const topData = JSON.parse(this.responseText);
    
                [].forEach.call(document.querySelector("main").querySelectorAll("section"), section => {
                    setTop(section, topData[section.id.toUpperCase()]);
                });
    
                break;
            default:
                showMessage(this);
            }
        });

        setTimeout(function () {
            requestAnimationFrame(getTop);
        }, 10000);
    }

}