import { Node } from './Node';
import { Link } from './Link';
export class GraphData {
    public Nodes: Array<Node> = [];
    public Links: Array<Link> = [];
    public NodeLookup: Map<string, Node> = new Map();
}
