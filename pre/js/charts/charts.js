//Desarrollo de las visualizaciones
import * as d3 from 'd3';
import { numberWithCommas3 } from '../helpers';
import { getInTooltip, getOutTooltip, positionTooltip } from '../modules/tooltip';
import { setChartHeight } from '../modules/height';
import { setChartCanvas, setChartCanvasImage } from '../modules/canvas-image';
import { setRRSSLinks } from '../modules/rrss';
import { setFixedIframeUrl } from './chart_helpers';

//Colores fijos
const COLOR_PRIMARY_1 = '#F8B05C',
COLOR_COMP_1 = '#528FAD';
let tooltip = d3.select('#tooltip');

export function initChart() {
    ///Lectura de datos
    d3.csv('https://raw.githubusercontent.com/CarlosMunozDiazCSIC/informe_perfil_mayores_2022_salud_2_6/main/data/enfermedades_cronicas_ees_2020.csv', function(error,data) {
        if (error) throw error;

        //////// SELECTOR
        let tipoEnfermedad = 'tension_alta', tipoBtn = 'fijo';
        document.getElementById('enfermedad_cronica').addEventListener('change', function(e) {
            tipoEnfermedad = e.target.value;
            updateAxis(tipoBtn, tipoEnfermedad);
        });

        //////// CAMBIO EJE Y
        document.getElementById('change_yaxis').addEventListener('click', function(e) {
            //Cambiamos eje

            if(tipoBtn == 'fijo') {
                tipoBtn = 'variable';
            } else {
                tipoBtn = 'fijo';
            }

            updateAxis(tipoBtn, tipoEnfermedad);
        });

        //////// VISUALIZACIÓN

        /// ELEMENTOS GENÉRICOS
        let margin = {top: 10, right: 10, bottom: 25, left: 30},
            width = document.getElementById('chart').clientWidth - margin.left - margin.right,
            height = document.getElementById('chart').clientHeight - margin.top - margin.bottom;

        let svg = d3.select("#chart")
            .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let edades = d3.map(data, function(d){return(d.Edad)}).keys();
        let tipos = ['hombres', 'mujeres'];
        
        let x = d3.scaleBand()
            .domain(edades)
            .range([0, width])
            .padding([0.35]);

        let xAxis = function(g) {
            g.call(d3.axisBottom(x));
            g.call(function(g){g.selectAll('.tick line').remove()});
            g.call(function(g){g.select('.domain').remove()});
        }

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        let y = d3.scaleLinear()
            .domain([0, 70])
            .range([ height, 0 ]);
        
        let yAxis = function(svg) {
            svg.call(d3.axisLeft(y).ticks(5).tickFormat(function(d,i) { return numberWithCommas3(d); }));
            svg.call(function(g) {
                g.call(function(g){
                    g.selectAll('.tick line')
                        .attr('class', function(d,i) {
                            if (d == 0) {
                                return 'line-special';
                            }
                        })
                        .attr('x1', '0%')
                        .attr('x2', `${width}`)
                });
            });
        }

        svg.append("g")
            .attr("class", "yaxis")
            .call(yAxis);

        let xSubgroup = d3.scaleBand()
            .domain(tipos)
            .range([0, x.bandwidth()])
            .padding([0]);

        let color = d3.scaleOrdinal()
            .domain(tipos)
            .range([COLOR_PRIMARY_1, COLOR_COMP_1]);


        /// FUNCIONES
        function init(type) {
            let auxData = data.filter(function(item) { if(item.enfermedad_2 == type){ return item; } });

            svg.append("g")
                .selectAll("g")
                .data(auxData)
                .enter()
                .append("g")
                .attr("transform", function(d) { return "translate(" + x(d.Edad) + ",0)"; })
                .attr('class', function(d) {
                    return 'grupo grupo_' + d.Edad;
                })
                .selectAll("rect")
                .data(function(d) { return tipos.map(function(key) { return {key: key, value: d[key]}; }); })
                .enter()
                .append("rect")
                .attr('class', function(d) {
                    return 'rect rect_' + d.key;
                })
                .attr("x", function(d) { return xSubgroup(d.key); })
                .attr("width", xSubgroup.bandwidth())
                .attr("fill", function(d) { return color(d.key); })
                .attr("y", function(d) { return y(0); })                
                .attr("height", function(d) { return height - y(0); })
                .on('mouseover', function(d,i,e) {
                    //Opacidad en barras
                    let css = e[i].getAttribute('class').split(' ')[1];
                    let bars = svg.selectAll('.rect');                    
            
                    bars.each(function() {
                        this.style.opacity = '0.4';
                        let split = this.getAttribute('class').split(" ")[1];
                        if(split == `${css}`) {
                            this.style.opacity = '1';
                        }
                    });

                    //Tooltip > Recuperamos el año de referencia
                    let currentAge = this.parentNode.classList.value.split(' ')[1];
                    let enfermedad = data.filter(function(item) { if (item.enfermedad_2 == tipoEnfermedad) { return item; } });
                    enfermedad = enfermedad[0];

                    let html = '<p class="chart__tooltip--title">' + enfermedad.Enfermedades + '</p>' + 
                            '<p class="chart__tooltip--text">El <b>' + numberWithCommas3(d.value) + '%</b> de <b>' + d.key + '</b> en este grupo de edad (<b>' + currentAge.split('_')[1] + '</b>) sufren este tipo de enfermedad crónica</p>';
                    
                    tooltip.html(html);

                    //Tooltip
                    positionTooltip(window.event, tooltip);
                    getInTooltip(tooltip);

                })
                .on('mouseout', function(d,i,e) {
                    //Quitamos los estilos de la línea
                    let bars = svg.selectAll('.rect');
                    bars.each(function() {
                        this.style.opacity = '1';
                    });
                
                    //Quitamos el tooltip
                    getOutTooltip(tooltip); 
                })
                .transition()
                .duration(2000)
                .attr("y", function(d) { return y(d.value); })                
                .attr("height", function(d) { return height - y(d.value); });
        }

        function animateChart() {
            svg.selectAll(".rect")
                .attr("x", function(d) { return xSubgroup(d.key); })
                .attr("width", xSubgroup.bandwidth())
                .attr("fill", function(d) { return color(d.key); })
                .attr("y", function(d) { return y(0); })                
                .attr("height", function(d) { return height - y(0); })
                .transition()
                .duration(2000)
                .attr("y", function(d) { return y(d.value); })                
                .attr("height", function(d) { return height - y(d.value); });
        }

        /// ACTUALIZACIONES
        function updateAxis(tipoBtn, tipo) {
            //Nos quedamos con los datos específicos
            let auxData = data.filter(function(item) { if(item.enfermedad_2 == tipo){ return item; } });
            let maxAux = 0;
            if (tipo == 'artrosis' || tipo == 'problemas_prostata') {
                maxAux = d3.max(auxData, function(d) { return +d.hombres; });
            } else if (tipo == 'osteoporosis' || tipo == 'problemas_menopausico') {
                maxAux = d3.max(auxData, function(d) { return +d.mujeres; });
            } else {
                maxAux = d3.max(auxData, function(d) { return +d.total; });
            }
            let yMax = 70;

            if(tipoBtn != 'fijo') {

                if(maxAux < 20) {
                    yMax = maxAux + 5;
                } else {
                    yMax = maxAux + 10;
                }

                //Modificamos el texto del botón
                document.getElementById('change_yaxis').textContent = 'Eje Y fijo';

            } else {

                //Modificamos el texto del botón
                document.getElementById('change_yaxis').textContent = 'Eje Y variable';

            }

            //Modificamos el eje Y de la visualización
            y.domain([0,Math.ceil(yMax)]);

            svg.select(".yaxis")
                .transition()
                .duration(2000)
                .call(yAxis);

            //Actualizamos el gráfico
            updateChart(auxData);
        }

        function updateChart(data) {
            svg.selectAll('.grupo')
                .data(data)
                .selectAll(".rect")
                .data(function(d) { return tipos.map(function(key) { return {key: key, value: d[key]}; }); })
                .attr("x", function(d) { return xSubgroup(d.key); })
                .attr("width", xSubgroup.bandwidth())
                .attr("fill", function(d) { return color(d.key); })
                .attr("y", function(d) { return y(0); })                
                .attr("height", function(d) { return height - y(0); })
                .transition()
                .duration(2000)
                .attr("y", function(d) { return y(d.value); })                
                .attr("height", function(d) { return height - y(d.value); });

            setTimeout(() => {
                setChartCanvas();
            }, 4000);
        }

        //////
        ///// Resto - Chart
        //////
        init(tipoEnfermedad);

        //Animación del gráfico
        document.getElementById('replay').addEventListener('click', function() {
            animateChart();

            setTimeout(() => {
                setChartCanvas();
            }, 4000);
        });

        //////
        ///// Resto
        //////
        //Iframe
        setFixedIframeUrl('informe_perfil_mayores_2022_salud_2_6','enfermedades_cronicas_espana');

        //Redes sociales > Antes tenemos que indicar cuál sería el texto a enviar
        setRRSSLinks('enfermedades_cronicas_espana');

        //Captura de pantalla de la visualización
        setTimeout(() => {
            setChartCanvas();
        }, 4000);

        let pngDownload = document.getElementById('pngImage');

        pngDownload.addEventListener('click', function(){
            setChartCanvasImage('enfermedades_cronicas_espana');
        });

        //Altura del frame
        setChartHeight();
    });

    
}