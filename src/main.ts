import * as _ from 'lodash';
import * as d3 from 'd3';

import { DependencyGraph } from './DependencyGraph';

//const width = 800, height = 800;
//const width = 800, height = 1250;
let width = window.innerWidth-25;
let height = window.innerHeight-25;

const svg = d3.select('#theGraph')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', -width/2+' '+ -height/2 +' '+width+' '+height); // 800 800');
    //.attr('viewBox', '-400 -400 800 800');


const graph = new DependencyGraph('/assets/data.json', svg, height, width);

const debounce =  _.debounce((value) => {
    graph.setFilter(value);
}, 500);

d3.select('#filterText').on('input', function () {
    debounce((<any>this).value);
});

graph.initialize();
