/**
 * @enum {number}
 */
const ENUM_TOKEN_TYPE = {
    NUM: 0,
    OP: 1,
    LET: 2,
    PAR: 3,
    CASE: 4,
    MIDCASE: 5,
}

/**
 * @enum {number}
 */
const ENUM_NODE_TYPE = {
    CONST: 0,
    VAR: 1,
    VAR_NAME: 2,
    PAR_WRAP: 3,
    CASE_WRAP: 4,
    TYPE_DEF: 5,
    STRUCT: 6,
    TYPE_DEF_NAME: 7,
}

/**
 * @typedef {{id: number,type: number, value: string}} TypeToken
 */

/**
 * @typedef {{
 *     id: number,
 *     type: number, // from NODE_TYPE
 *     name: string,
 *     token: TypeToken,
 *     children: TypeNode,
 *     parent: TypeNode,
 *     next: TypeNode,
 *     last: TypeNode,
 * }} TypeNode 
 */


/**
 * 通过对象值来寻找键(key)
 * @param {Object} object 查找的值
 * @param {*} value 需要寻找的键
 * @returns 对象中查找到的key
 */
var getObjectKey = (object, value) => {
    return Object.keys(object).find(key => object[key] == value);
};

var isParen = (c) => /[\(\)]/.test(c);
var isCase = (c) => /[\{\}]/.test(c);
var isMidCase = (c) => /[\[\]]/.test(c);
var isNumber = (c) => /[0-9\.\-e]/.test(c);
var isLetter = (c) => /[a-z_]/i.test(c);
var isLetterContinue = (c) => /[a-z_0-9]/i.test(c);
var isOperator = (c) => (/[\+\-\*\/]/.test(c));
var isEmpty = (c) => /\s|\;/.test(c);
var isTypedef = (str) => /typedef/i.test(str);
var isStruct = (str) => /struct/i.test(str);
var isBaseType = (str) => /bool|int|short|char|float|double|int32_t|uint32_t|int16_t|uint16_t|int8_t|uint8_t/.test(str);
var isKeyWord = (str) => /(typedef|struct|define|if|else)/.test(str);

var idDeliver = 0;
var getID = () => idDeliver++;
var resetID = () => {
    idDeliver = 0;
}

/**
 * 
 * @param {string} content 
 */
var tokenizer = (content) => {
    let idx = 0;
    /**
     * @type {TypeToken[]}
     */
    let tokens = [];
    let char = content[idx];

    function readNextChar() {
        char = content[++idx];
    }

    function isAtEOF() {
        return idx >= content.length;
    }

    while (idx < content.length) {
        if (isEmpty(char)) {
            readNextChar();
            continue;
        }

        if (isParen(char)) {
            tokens.push({
                id: getID(),
                type: ENUM_TOKEN_TYPE.PAR,
                value: char
            });
            readNextChar();
            continue;
        }

        if (isCase(char)) {
            tokens.push({
                id: getID(),
                type: ENUM_TOKEN_TYPE.CASE,
                value: char
            });
            readNextChar();
            continue;
        }

        if (isMidCase(char)) {
            tokens.push({
                id: getID(),
                type: ENUM_TOKEN_TYPE.MIDCASE,
                value: char
            });
            readNextChar();
            continue;
        }

        if (isNumber(char)) {
            let tmp = "";
            while (isNumber(char)) {
                tmp += String(char);
                readNextChar();
                if (isAtEOF()) break;
            }
            tokens.push({
                id: getID(),
                type: ENUM_TOKEN_TYPE.NUM,
                value: tmp
            });
            continue;
        }

        if (isLetter(char)) {
            let tmp = "";
            do {
                tmp += char;
                readNextChar();
                if (isAtEOF()) break;
            } while (isLetterContinue(char));
            tokens.push({
                id: getID(),
                type: ENUM_TOKEN_TYPE.LET,
                value: tmp
            });
            continue;
        }

        if (isOperator(char)) {
            let tmp = "";
            do {
                tmp += char;
                readNextChar();
                if (isAtEOF()) break;
            } while (isOperator(char));
            tokens.push({
                id: getID(),
                type: ENUM_TOKEN_TYPE.OP,
                value: tmp
            });
            continue;
        }

        throw new TypeError('Unkown: ' + char);
    }

    return tokens;
}



/**
 * 层级区分
 * @param {TypeToken[]} tokens
 */
var parser = (tokens) => {
    let index = 0;
    /**
     * @type {TypeNode}
     */
    let nodeOut;
    /**
     * @param {TypeNode} lastNode
     * @returns {TypeNode}
     */
    var walker = (lastNode) => {
        let token = tokens[index];
        /** @type {TypeNode} */
        let node = {
            id: getID(),
            type: undefined,
            name: token.value,
            // token: token,
            last: lastNode,
            next: undefined,
        };
        switch (token.type) {
            case ENUM_TOKEN_TYPE.LET:
                index++;
                node.type = ENUM_NODE_TYPE.VAR;
                // if (isTypedef(token.value)) {
                //     // having two argument
                //     node.children.push(walker());
                //     node.children.push(walker());
                // } else if (isStruct(token.value)) {
                //     if (tokens[index].value == "{") { // unnamed struct
                //         node.children.push(walker());
                //     } else { // named struct
                //         node.children.push(walker());
                //         node.children.push(walker());
                //     }
                // } else { // normal variable
                //     // if (dealingNodeNum == 0) {
                //     //     dealingNodeNum = true;
                //     //     node.children.push(walker());
                //     //     dealingNodeNum = false;
                //     // }
                // }
                break;

            case ENUM_TOKEN_TYPE.NUM:
                index++;
                node.type = ENUM_NODE_TYPE.CONST;
                break;

            case ENUM_TOKEN_TYPE.MIDCASE: // parse array
                node.type = ENUM_NODE_TYPE.PAR_WRAP;
                if (token.value == "[") {
                    index++;
                    /** @type {TypeNode} */
                    let head = tokens[index];
                    while (head.type != ENUM_TOKEN_TYPE.MIDCASE || head.value != "]") {
                        node.children.push(walker(undefined));
                        head = tokens[index];
                    }
                    index++;
                } else if (token.value == "]") {
                    throw new Error("wtf unexpected ]: ", token);
                } else {
                    throw new Error("wtf token type par: ", token);
                }
                break;

            case ENUM_TOKEN_TYPE.CASE:
                node.type = ENUM_NODE_TYPE.CASE_WRAP;
                if (token.value == "{") {
                    index++;
                    /** @type {TypeToken} */
                    let head = tokens[index];
                    /** @type {undefined | TypeNode} */
                    let tmpLastNode;
                    while (head.type != ENUM_TOKEN_TYPE.CASE || head.value != "}") {
                        let newNode = walker(tmpLastNode);
                        newNode.parent = node;
                        if (node.children == undefined) { // first children
                            node.children = newNode;
                        } else { // other children
                            tmpLastNode.next = newNode;
                        }
                        tmpLastNode = newNode;
                        head = tokens[index];
                    }
                    index++;
                } else if (token.value == "}") {
                    throw new Error("wtf unexpected }: ", token);
                } else {
                    throw new Error("wtf token type case: ", token);
                }
                break;

            default:
                throw new Error("wtf token type: ", token);
        }
        if (lastNode != undefined) {
            lastNode.next = node;
        }
        return node;
    }

    let nodeLast = undefined;
    while (index < tokens.length) {
        let node = walker(nodeLast);
        if (nodeOut == undefined) {
            nodeOut = node;
        }
        nodeLast = node;
    }
    return nodeOut;
}

/**
 * @param {TypeNode} node
 * @param {number} times
 */
var nodeRecursiveGetNext = (node, times) => {
    let out = node;
    while (times-- > 0) {
        out = out.next;
        if (out == undefined) {
            return out;
        }
    }
    return out;
}

/**
 * @param {TypeNode} nodes
 */
var nodeArange = (nodes) => {
    nodes[0].last = undefined;
    nodes[nodes.length - 1].next = undefined;
    for (let i = 1; i < nodes.length; i++) {
        nodes[i - 1].next = nodes[i];
        nodes[i].last = nodes[i - 1];
    }
}

/**
 * 二次修复节点树
 * @param {TypeNode} node
 */
var nodeTraveler = (node) => {
    let head = node;
    /**
     *  @param {TypeNode} node
     */
    let travelerStruct = (node) => {
        if (!isStruct(node.name)) {
            return;
        }
        node.type = ENUM_NODE_TYPE.STRUCT;
        let structName = nodeRecursiveGetNext(node, 1);
        let structBody = nodeRecursiveGetNext(node, 2);
        if (structName.name == "{") { // unnamed struct
            structBody = structName;
            node.next = structBody.next;
            node.children = structBody.children;
            node.children.parent = node;
        } else { // named struct
            //! TODO: 
        }
    }
    /**
     *  @param {TypeNode} node
     */
    let travelerTypedef = (node) => {
        if (!isTypedef(node.name)) {
            return;
        }
        node.type = ENUM_NODE_TYPE.TYPE_DEF;
        let defNode = nodeRecursiveGetNext(node, 1);
        let defName = nodeRecursiveGetNext(node, 2);
        defName.type = ENUM_NODE_TYPE.TYPE_DEF_NAME;
        node.next = defName.next;
        node.children = defNode;
        defNode.parent = node;
        nodeArange([defNode, defName]);
    }
    /**
     *  @param {TypeNode} node
     */
    let travelerType = (node) => {
        if (!isBaseType(node.name)) {
            return;
        }
        node.type = ENUM_NODE_TYPE.VAR;
        let varName = nodeRecursiveGetNext(node, 1);
        varName.type = ENUM_NODE_TYPE.VAR_NAME;
        node.next = varName.next;
        node.children = varName;
        node.children.parent = node;
        node.children.next = undefined;
        node.children.last = undefined;
    }
    walkNodeRecursive(head, travelerStruct);
    walkNodeRecursive(head, travelerTypedef);
    walkNodeRecursive(head, travelerType);
    return head;
}

var walkNodeRecursive = (node, doFcn) => {
    doFcn(node);
    if (node.children) { // having children
        walkNodeRecursive(node.children, doFcn);
    }
    if (node.next) {
        walkNodeRecursive(node.next, doFcn);
    }
}

/**
 * @param {TypeNode} node 
 */
var nodeToHtml = (_node) => {
    let node = _node;
    let outHtml = "";
    function getNodeName(node) {
        return "@ " + node.id + " - " + getObjectKey(ENUM_NODE_TYPE, node.type) + " - " + node.name;
    }
    function wrapWithClass(cls, content) {
        return "<div class=" + cls + ">" + content + "</div>";
    }
    function walker(_node) {
        let node = _node;
        let out = getNodeName(node);
        if (node.children) { // having children
            let content = "";
            content += walker(node.children);
            out += wrapWithClass("children", content);
        }

        out = wrapWithClass("brother", out);

        node = _node;
        if (node.next == undefined) {
            return out;
        }

        let content = walker(node.next);
        out += content;
        return out;
    }

    outHtml = walker(node);
    return outHtml;
}

var convert = (inp) => {
    resetID();
    let tokens = tokenizer(inp);
    console.log(tokens);
    resetID();
    let node = parser(tokens);
    console.log(node);
    let fixedNode = nodeTraveler(node);
    console.log(fixedNode);
    let draws = nodeToHtml(fixedNode);
    return draws;
};

export {
    convert
};