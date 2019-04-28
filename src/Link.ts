import { SimulationLinkDatum } from 'd3';
import { Node } from './Node';
export class Link implements SimulationLinkDatum<Node> {
    public source: Node;
    public target: Node;
    constructor() { }
}
