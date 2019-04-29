import { rawData } from "./rawData";
import { rawLink } from "./rawLink";
import { rawNode } from "./rawNode";
import { GraphData } from "./GraphData";
import { Link } from "./Link";
import { Node } from "./Node";

import * as d3 from 'd3';
import * as _ from 'lodash';

export class DependencyGraph {
    private _dataPromise: Promise<any>;
    private _filteredData: GraphData = new GraphData();
    private _circleRadius: number = 10;
    private _arrowHeadSize: number = 10;
    private _xCenter: Array<number>;
    public Data: GraphData = new GraphData();
    constructor(private _dataPath: string, private _svg: d3.Selection<SVGSVGElement, {}, HTMLElement, any>, public Width: number = 800, public Height: number = 800) {
        this._xCenter = [ this.Width/3-this.Width/6, this.Width/3+this.Width/6 ]
        this.loadData();
    }
    private loadData(): void {
        this._dataPromise = d3.json<rawData>(this._dataPath).then((d: rawData) => {
            this.Data.Nodes = _.map(d.nodes, (node: rawNode) => {
                const newNode = new Node();
                newNode.name = node.name;
                newNode.type = node.pan;
                this.Data.NodeLookup.set(node.name, newNode);
                return newNode;
            });
            this.Data.Links = _.map(d.links, (link: rawLink) => {
                const newLink = new Link();
                if (this.Data.NodeLookup.has(link.source)) {
                    newLink.source = <Node>this.Data.NodeLookup.get(link.source);
                    newLink.source.outboundLinks.push(newLink);
                } else {
                    console.error(link.source);
                }
                if (this.Data.NodeLookup.has(link.target)) {
                    newLink.target = <Node>this.Data.NodeLookup.get(link.target);
                    newLink.target.inboundLinks.push(newLink);
                } else {
                    console.error(link.target);
                }
                return newLink;
            });
        });
    }
    private _drag() {
        var self = this;
        return d3.drag()
            .on('start', function (d: any) {
                if (!d3.event.active)
                    self._simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (d: any) => {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            })
            .on('end', (d: any) => {
                if (!d3.event.active)
                    self._simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }
    private _simulation: d3.Simulation<Node, undefined>;
    private createGraph() {
        this._simulation = d3.forceSimulation(this.Data.Nodes)
            .force('link', d3.forceLink(this.Data.Links).id((d: Node) => d.name).distance(50))
            .force('charge', d3.forceManyBody().strength(10))
            .force('center', d3.forceCenter(this.Width / 2, this.Height / 2))
            .force('collision', d3.forceCollide().radius(50).strength(0.1))
            .force('x', d3.forceX().x( (node: Node) => { return this._xCenter[node.type == 'CPAN' ? 1 : 0]; }));
        
        this._svg.append('defs').selectAll('marker')
            .data(['default'])
            .enter().append('marker')
            .attr('id', d => d)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', this._circleRadius + this._arrowHeadSize)
            .attr('refY', 0)
            .attr('markerWidth', this._arrowHeadSize)
            .attr('markerHeight', this._arrowHeadSize)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5');
        const link = this._svg.append('g')
            .selectAll('path')
            .data(this.Data.Links)
            .join('path')
            .attr('class', 'link default')
            .attr('marker-end', 'url(#default)');
        const node = this._svg.append('g')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .selectAll('g')
            .data(this.Data.Nodes, (d: Node) => d.name)
            .join('g')
            .attr('class', 'node');
        
        const nodeCircle = node
            .append('circle')
            .on('click', (node) => {
                const previousHighlight = node.highlightSelf;
                console.log('Type: '+node.type);
                console.log( node.type == 'CPAN' ? 'external' : 'internal' );
                this.Data.Nodes.forEach(node => {
                    node.highlightSelf = node.highlightInbound = node.highlightOutbound = false;
                });
                node.highlightSelf = !previousHighlight;
                node.inboundLinks.forEach(link => link.source.highlightInbound = node.highlightSelf);
                node.outboundLinks.forEach(link => link.target.highlightOutbound = node.highlightSelf);
            })
            .attr('r', this._circleRadius)
            .style('fill', (node) => this._colorByType(node))
            .call(this._drag());

        const nodeText = node
            .append('text')
            .attr('stroke', 'none')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'black')
            .attr('x', 12)
            .text(d => d.name);
        this._simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y)
                .attr('d', this._linkArc);
            nodeCircle
                .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
            nodeText
                .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');

            nodeCircle.style('stroke', d => d.highlightSelf ? '#0F0' : d.highlightInbound ? '#F00' : this._colorByType(d));
            nodeCircle.style('fill', d => d.highlightOutbound ? '#F00' : this._colorByType(d));
        });
    }
    private _linkArc(d: Link) {
        return 'M' + d.source.x + ',' + d.source.y + 'A' + 0 + ',' + 0 + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
    }

    private _colorByType ( node: Node ){
        if ( node.type == 'CPAN' ) {
                    return '#215117'
                 } else if ( node.type == 'ECuPAN') {
                    return '#0c2f68'
                 } else {
                     return '#333'
                 } 

    }

    public initialize(): void {
        this._dataPromise.then(() => {
            this.createGraph();
        });
    }

    private _filterText: string | undefined;

    private filterInPlace<T>(array: Array<T>, backup: Array<T>, condition: (elem: T) => boolean): void {
        let replaceIndex = 0;
        for(let index = 0; index < array.length; index++) {
            const elem = array[index];
            if(condition(elem)) {
                array[replaceIndex++] = elem;
            } else {
                backup.push(elem);
            }
        }

        array.length = replaceIndex;
        this._simulation.restart();
    }

    public setFilter(value: string | undefined): void {
        if(value && value.replace(/\s/g, "").length > 0 ? false : true)
            value = undefined;
        if(value !== undefined) {
            const filter = value.toLowerCase();
            this._filterText = filter;
            const filterName = (node: Node) => node.name.toLowerCase().includes(filter);
            this.filterInPlace(this.Data.Nodes, this._filteredData.Nodes, filterName);
            this.filterInPlace(this.Data.Links, this._filteredData.Links, (link) => filterName(link.source) || filterName(link.target));
        } else {
            this._filterText = value;
            this._filteredData.Nodes.forEach(x => this.Data.Nodes.push(x));
            this._filteredData.Nodes = [];
            this._filteredData.Links.forEach(x => this.Data.Links.push(x));
            this._filteredData.Links = [];
        }
    }
}
