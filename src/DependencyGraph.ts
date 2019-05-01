import { rawData } from "./rawData";
import { rawLink } from "./rawLink";
import { rawNode } from "./rawNode";
import { GraphData } from "./GraphData";
import { Link } from "./Link";
import { Node } from "./Node";

import * as d3 from 'd3';
import * as _ from 'lodash';
import { DH_CHECK_P_NOT_PRIME } from "constants";

export class DependencyGraph {
    private _dataPromise: Promise<any>;
    public Data: GraphData = new GraphData();

    private _linkGroup: d3.Selection<SVGGElement, {}, HTMLElement, any>;
    private _nodeGroup: d3.Selection<SVGGElement, {}, HTMLElement, any>;
    private _forceReset: number;

    constructor(private _dataPath: string, private _svg: d3.Selection<SVGSVGElement, {}, HTMLElement, any>, public Width: number = 800, public Height: number = 800) {
        this.loadData();
    }
    private loadData(): void {
        this._dataPromise = d3.json<rawData>(this._dataPath).then((d: rawData) => {
            this.Data.Nodes = _.map(d.nodes, (node: rawNode) => {
                const newNode = new Node();
                newNode.name = node.name;
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
    private _color = d3.scaleOrdinal(d3.schemeCategory10);
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

    private _createGraph() {
        this._simulation = d3.forceSimulation(this.Data.Nodes)
            .force('link', d3.forceLink(this.Data.Links).id((d: Node) => d.name).strength(0.05))
            //.force('charge', d3.forceManyBody().strength(-0.5))
            //.force('r', d3.forceRadial(150, 0, 0).strength(0.2))
            .force('highlightX', d3.forceX(150).strength(0))
            .force('highlightY', d3.forceY(150).strength(0))
            .force('center', d3.forceCenter())
            .force('collision', d3.forceCollide(50).strength(0.05));

        this._svg.append('defs').selectAll('marker')
            .data(['default'])
            .enter().append('marker')
            .attr('id', d => d)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10 + 15 + 1.5)
            .attr('refY', -1.5)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5');

        this._linkGroup = this._svg.append('g').attr('class', 'links');
        this._nodeGroup = this._svg.append('g').attr('class', 'nodes');

        this._simulation.on('tick', () => {
            this._linkGroup
                .selectAll('path')
                .data(this.Data.Links)
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y)
                .attr('d', this._linkArc)
                .style('stroke', link => link.highlightInbound || link.highlightOutbound ? '#F00' : '#666' )
                .style('stroke-dasharray', link => link.highlightInbound ? '0,2 1' : 'none' );

            const nodes = this._nodeGroup
                .selectAll('g')
                .data(this.Data.Nodes, (d: Node) => d.name);

            const nodeCircles = nodes
                .select('circle')
                .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
            const nodeTexts = nodes
                .select('text')
                .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');

            nodeCircles.style('stroke', d => d.highlightSelf ? '#0F0' : d.highlightInbound ? '#F00' : '#333');
            nodeCircles.style('fill', d => d.highlightOutbound ? '#F00' : '#333');
        });
    }

    private _updateGraph() {
        const links = this._linkGroup
            .selectAll('path')
            .data(this.Data.Links, (d: Link) => d.source.name + '_' + d.target.name);

        links.exit().remove();

        links.enter()
            .append('path')
            //.attr('stroke-width', d => Math.sqrt(d.target.inboundLinks))
            .attr('id', (d: Link) => d.source.name + '_' + d.target.name)
            .attr('class', 'link default')
            .attr('marker-end', 'url(#default)');

        const nodes = this._nodeGroup
            .selectAll('g')
            .data(this.Data.Nodes, (d: Node) => 'node_' + d.name);
        nodes.exit().remove();

        const newNodes = nodes.enter()
            .append('g')
            .attr('class', 'node')
            .attr('id', d => 'node_' + d.name);


        const nodeCircle = newNodes
            .append('circle')
            .on('click', (node) => {
                this._setForceTimer();

                const previousNodeHighlight = node.highlightSelf;
                this.Data.Nodes.forEach(node => {
                    node.highlightSelf = node.highlightInbound = node.highlightOutbound = false;
                });

                this.Data.Links.forEach(link => {
                    link.highlightInbound = link.highlightOutbound = false;
                });
                node.highlightSelf = !previousNodeHighlight;
                node.inboundLinks.forEach(link =>
                    { 
                      link.source.highlightInbound = node.highlightSelf;
                      link.highlightInbound = true;
                    });
                node.outboundLinks.forEach(link => 
                    { 
                        link.target.highlightOutbound = node.highlightSelf;
                        link.highlightOutbound = true;
                    }
                    );

                (<any>this._simulation.force('highlightX')).strength((d: any) => d.highlightSelf ? 0.2 : d.highlightInbound || d.highlightOutbound ? 0.05 : 0);
                (<any>this._simulation.force('highlightY')).strength((d: any) => d.highlightSelf ? 0.2 : d.highlightInbound || d.highlightOutbound ? 0.05 : 0);
            })
            .attr('r', 10)
            .call(this._drag());

        const nodeText = newNodes
            .append('text')
            .attr('stroke', 'none')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'black')
            .attr('x', 12)
            .text(d => d.name);
    }
    private _setForceTimer() {
        if (this._forceReset)
            clearTimeout(this._forceReset);

        this._forceReset =
            <any>setTimeout(() => {
                this._simulation.alphaTarget(0);
            }, 5000);
        //if (!d3.event.active)
        this._simulation.alphaTarget(0.3).restart();
    }

    private _linkArc(d: Link) {
        return 'M' + d.source.x + ',' + d.source.y + 'A' + 0 + ',' + 0 + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
    }
    public initialize(): void {
        this._dataPromise.then(() => {
            this._createGraph();
            this._updateGraph();
        });
    }

    private _filterText: string | undefined;

    private filterInPlace<T>(array: Array<T>, backup: Array<T>, condition: (elem: T) => boolean): void {
        let replaceIndex = 0;
        for (let index = 0; index < array.length; index++) {
            const elem = array[index];
            if (condition(elem)) {
                array[replaceIndex++] = elem;
            } else {
                backup.push(elem);
            }
        }

        array.length = replaceIndex;
    }

    private _filteredData: GraphData = new GraphData();

    public setFilter(value: string | undefined): void {
        if (value && value.replace(/\s/g, "").length > 0 ? false : true)
            value = undefined;
        if (value !== undefined) {
            const filter = value.toLowerCase();
            this._filterText = filter;
            const filterName = (node: Node) => node.name.toLowerCase().includes(filter);
            this.filterInPlace(this.Data.Nodes, this._filteredData.Nodes, filterName);
            this.filterInPlace(this.Data.Links, this._filteredData.Links, (link) => filterName(link.source) && filterName(link.target));

            this._setForceTimer();
        } else {
            this._filterText = value;
            this._filteredData.Nodes.forEach(x => this.Data.Nodes.push(x));
            this._filteredData.Nodes = [];
            this._filteredData.Links.forEach(x => this.Data.Links.push(x));
            this._filteredData.Links = [];

            this._setForceTimer();
        }
        this._updateGraph();
    }
}
