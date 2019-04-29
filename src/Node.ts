import { SimulationNodeDatum } from 'd3';
import { Link } from "./Link";
export class Node implements SimulationNodeDatum {
    constructor() { }
    public x: number = 0;
    public y: number = 0;
    //public inboundLinks: number = 0;
    //public inbounds: Array<Node> = [];
    public inboundLinks: Array<Link> = [];
    public outboundLinks: Array<Link> = [];
    //public outboundLinks: number = 0;
    //public outbounds: Array<Node> = [];
    public highlightInbound: boolean = false;
    public highlightOutbound: boolean = false;
    public highlightSelf: boolean = false;
    public name: string;
    public type: string;
}
