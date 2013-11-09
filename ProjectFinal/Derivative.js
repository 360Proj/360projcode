//initialize global variables
//yScale is a constant used to help visualize the derivative because of scaling issues with the derivative view
var height = 1000, width = 1300, yScale = 10, radius= 10;
var undoArray = [], redoArray = [];

//setup main SVG view
var vizSVGMain = d3.select("#viz")
    .append("svg")
    .attr("id", "main")
    .attr("width", width)
    .attr("height", height);

//create + set pointer to SVG derivative view
var vizDOMElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

var vizSVG = d3.select(vizDOMElement)
    .attr("viewBox", "0 -500 1300 1000")
    .attr("preserveAspectRatio", "xMinYMid meet")
    .attr("id", "innerSvg");


getElement("main").appendChild(vizDOMElement);

//x-axis
vizSVG.append('g')
    .attr("class", "axis")
    .call(d3.svg.axis().scale(d3.scale.identity().domain([0,width]))
        .tickValues([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200]).orient('bottom'));

//y-axis
vizSVG.append('g')
    .attr("class", "axis")
    .call(d3.svg.axis().scale(d3.scale.linear().domain([-500,500]).range([500, -500]))
        .tickValues([-400, -300, -200, -100, 100, 200, 300, 400]).orient('right'));

/////////////////////////////////Move/Functions////////////////////////////////////////

function movedStartPoint(X, Y, controlX, controlY){
    var point = getObEl(vizDOMElement, 'pointAa'), newY = calculateNewY(X,Y,controlX,controlY);
    var line =  getReferenceElementDeriv(vizDOMElement, point, 'line');

    //update start of line + point
    updateLineLeft(line, X, newY);
    updatePoint(point, X, newY);

    //update second derivative
    updateSDStart(getObEl(secondDeriv, 'pointAad'), X, newY, getReferenceElementDeriv(vizDOMElement, line, 'rightPoint'));
}

function movedEndPoint(X, Y, controlX, controlY){
    var point = getObEl(vizDOMElement, 'pointCb'), newY = calculateNewY(controlX,controlY,X,Y);
    var line =  getReferenceElementDeriv(vizDOMElement, point, 'line');

    //update end of line + point
    updateLineRight(line, X, newY);
    updatePoint(point, X, newY);

    //update second derivative
    updateSDEnd(getObEl(secondDeriv, 'pointCbd'), X, newY, getReferenceElementDeriv(vizDOMElement, line, 'leftPoint'));
}

function movedMidPoint(ID, X, Y, leftX, leftY, rightX, rightY){
    //changing 2 lines + 2 points
    var pointA = getObEl(vizDOMElement, ID+'a'), pointB = getObEl(vizDOMElement, ID+'b');
    var newYB = calculateNewY(leftX, leftY, X, Y), newYA = calculateNewY(X ,Y, rightX, rightY);
    var lineB = getReferenceElementDeriv(vizDOMElement, pointB, 'line');
    var lineA = getReferenceElementDeriv(vizDOMElement, pointA, 'line');

    //update end of first line
    updateLineRight(lineB, X, newYB);
    updatePoint(pointB, X, newYB);

    //update start of second line
    updateLineLeft(lineA, X, newYA);
    updatePoint(pointA, X, newYA);

    //update second derivative
    updateSDEnd(getObEl(secondDeriv, ID+'bd'), X, newYB, getReferenceElementDeriv(vizDOMElement, lineB, 'leftPoint'));
    updateSDStart(getObEl(secondDeriv, ID+'ad'), X, newYA, getReferenceElementDeriv(vizDOMElement, lineA, 'rightPoint'));
}

function movedControl(leftPoint, rightPoint, X, Y){
    var derivLeftPoint = getObEl(vizDOMElement, leftPoint.getAttribute("id")+'a');
    var derivRightPoint = getObEl(vizDOMElement, rightPoint.getAttribute("id")+'b');
    var newYL = calculateNewY(leftPoint.getAttribute("cx"),leftPoint.getAttribute("cy"),X,Y),
        newYR = calculateNewY(X,Y,rightPoint.getAttribute("cx"), rightPoint.getAttribute("cy"));

    //update line + left and right points
    d3.select(getReferenceElementDeriv(vizDOMElement, derivLeftPoint, 'line')).attr('y1', newYL).attr('y2', newYR);
    derivLeftPoint.setAttribute('cy', newYL);
    derivRightPoint.setAttribute('cy', newYR);

    //update second derivative
    updateSDControl(getObEl(secondDeriv, leftPoint.getAttribute('id')+'ad'), getObEl(secondDeriv, rightPoint.getAttribute('id')+'bd'), derivLeftPoint, derivRightPoint);
}

//////////////////////////////////////////Add/////////////////////////////////////////

function addPoint(id, X, Y, leftNode, rightNode, leftControl, rightControl){
    var left = getObEl(vizDOMElement, leftNode.getAttribute('id')+'a');
    var right = getObEl(vizDOMElement, rightNode.getAttribute('id')+'b');
    var newY1 = calculateNewY(leftControl.getAttribute("cx"), leftControl.getAttribute("cy"), X, Y),
        newY2 = calculateNewY(X, Y, rightControl.getAttribute("cx"), rightControl.getAttribute("cy"));
    var oldY1 = calculateNewY(leftNode.getAttribute("cx"), leftNode.getAttribute("cy"), leftControl.getAttribute("cx"), leftControl.getAttribute("cy"));
    var oldY2 = calculateNewY(rightControl.getAttribute("cx"), rightControl.getAttribute("cy"), rightNode.getAttribute("cx"), rightNode.getAttribute("cy"));

    //update old points
    d3.select(getReferenceElementDeriv(vizDOMElement, left, "line")).attr("y1", oldY1).attr("y2", oldY2);
    left.setAttribute("cy", oldY1);
    right.setAttribute("cy", oldY2);

    //create new points + line
    createLine('Line'+id, X, newY2, right.getAttribute('cx'), right.getAttribute('cy'), 'Point'+id+'a', right.getAttribute('id'));
    createPoint('Point'+id+'b', X, newY1, left.getAttribute('line'));
    createPoint('Point'+id+'a', X, newY2, 'Line'+id);

    //set pointers
    d3.select(getReferenceElementDeriv(vizDOMElement, left, 'line')).attr('x2', X).attr('y2', newY1).attr("rightPoint", "Point"+id+"b");
    right.setAttribute('line', 'Line'+id);

    moveToFront(getReferenceElementDeriv(vizDOMElement, right, 'id'));

    //update second derivative
    addSDPoint(left, right, getObEl(vizDOMElement, 'Point'+id+'a'), getObEl(vizDOMElement, 'Point'+id+'b'));
}

//////////////////////////////////////Remove/////////////////////////////////////////////

function removeStartPoint(rightPointId){
    var thisPoint = getObEl(vizDOMElement, 'pointAa'), rightPoint = getObEl(vizDOMElement, rightPointId+'b');
    var leftPoint = getObEl(vizDOMElement, rightPointId+'a');
    var lPointId = leftPoint.getAttribute('id'), rPointId = rightPoint.getAttribute('id');

    //remove both points + line
    d3.select(getReferenceElementDeriv(vizDOMElement, thisPoint, 'line')).remove();
    d3.select(rightPoint).remove();
    d3.select(thisPoint).remove();

    //connect references + set new start point
    getReferenceElementDeriv(vizDOMElement, leftPoint, 'line').setAttribute('leftPoint', 'pointAa');  //set lines left point
    leftPoint.setAttribute('id', 'pointAa');

    //update second derivative
    removeSDStartPoint(rPointId, lPointId);

}

function removeEndPoint(leftPointId){
    var thisPoint = getObEl(vizDOMElement, 'pointCb'), leftPoint = getObEl(vizDOMElement, leftPointId+'a');
    var rightPoint = getObEl(vizDOMElement, leftPointId+'b');
    var rPointId = rightPoint.getAttribute('id'), lPointId = leftPoint.getAttribute('id');

    //remove both points + line
    d3.select(getReferenceElementDeriv(vizDOMElement, thisPoint, 'line')).remove();
    d3.select(leftPoint).remove();
    d3.select(thisPoint).remove();

    //connect references + set new end point
    getReferenceElementDeriv(vizDOMElement, rightPoint, 'line').setAttribute('rightPoint', 'pointCb');
    rightPoint.setAttribute('id', 'pointCb');

    //update second derivative
    removeSDEndPoint(rPointId, lPointId);
}

function removeMidPoint(thisId, leftControl, leftNode, rightNode){
    var idA = getObEl(vizDOMElement, thisId+'a'), idB = getObEl(vizDOMElement, thisId+'b');
    var leftPoint = getObEl(vizDOMElement, leftNode.getAttribute("id")+'a');
    var rightPoint = getObEl(vizDOMElement, rightNode.getAttribute("id")+'b');
    var newY2 = calculateNewY(leftControl.getAttribute('cx'), leftControl.getAttribute('cy'),
        rightNode.getAttribute('cx'), rightNode.getAttribute('cy'));

    //remove both points + line
    d3.select(idA).remove();
    d3.select(idB).remove();
    d3.select(getReferenceElementDeriv(vizDOMElement, rightPoint, 'line')).remove();

    //set new y-values for right path + point
    d3.select(getReferenceElementDeriv(vizDOMElement, leftPoint, 'line')).attr('x2', rightPoint.getAttribute('cx')).attr('y2', newY2);
    rightPoint.setAttribute('cy', newY2);

    //connect references
    rightPoint.setAttribute('line', leftPoint.getAttribute('line'));
    getReferenceElementDeriv(vizDOMElement, leftPoint, 'line').setAttribute('rightPoint', rightPoint.getAttribute("id"));

    moveToFront(rightPoint);

    //update second derivative
    removeSDMidPoint(thisId, leftPoint, rightPoint);
}

//////////////////////////////////////Undo/Redo////////////////////////////////////////////

function addUndoState(){

    //push view onto undo stack
    undoArray.push(vizDOMElement.cloneNode(true));

    //clear redoArray
    redoArray = [];

    //add state to second derivative
    addSDUndoState();
}

function undo(){

    //add view to redo array + replace current view
    redoArray.push(vizDOMElement);
    var newView = undoArray.pop();

    //update view if the current view is on the derivative
    if(getElement("derivButton").disabled)
        getElement("main").replaceChild(newView, vizDOMElement);

    //reset viz pointers
    vizDOMElement = newView;
    vizSVG = d3.select(vizDOMElement);

    //undo second derivative
    undoSD();
}

function redo(){

    //add current view to undo array + replace the current view
    undoArray.push(vizDOMElement);
    var newView = redoArray.pop();

    //update view if the current view is on the derivative
    if(getElement("derivButton").disabled)
        getElement("main").replaceChild(newView, vizDOMElement);

    //reset viz pointers
    vizDOMElement = newView;
    vizSVG = d3.select(vizDOMElement);

    //redo second derivative
    redoSD();
}

//////////////////////////////////New/Y/Value/////////////////////////////////////

function calculateNewY(leftX, leftY, rightX, rightY){
    return yScale*(parseFloat(rightY) - parseFloat(leftY)) / (parseFloat(rightX) - parseFloat(leftX));
}

////////////////////////////////Update/SVG/Objects///////////////////////////////

function updateLineLeft(element, x1, y1){
    d3.select(element).attr('x1', x1).attr('y1', y1);
}

function updateLineRight(element, x2, y2){
    d3.select(element).attr('x2', x2).attr('y2', y2);
}

function updatePoint(element, cx, cy){
    d3.select(element).attr('cx', cx).attr('cy', cy);
}

//////////////////////////////////////Switch/Views///////////////////////////////

function displayDerivative(){
    //update buttons
    getElement("derivButton").disabled = true;
    getElement("secondDButton").disabled = false;

    //replace view
    getElement("main").replaceChild(vizDOMElement, secondDeriv);
}

function displaySecondDerivative(){
    //update buttons
    getElement("secondDButton").disabled = true;
    getElement("derivButton").disabled = false;

    //replace view
    getElement("main").replaceChild(secondDeriv, vizDOMElement);
}

//////////////////////////////Special/Case/////////////////////////////////////

function specialCase(){
    d3.selectAll(vizDOMElement.childNodes).remove();

    //add x-axis back
    vizSVG.append('g')
        .attr("class", "axis")
        .call(d3.svg.axis().scale(d3.scale.identity().domain([0,width]))
            .tickValues([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200]).orient('bottom'));

    //add y-axis back
    vizSVG.append('g')
        .attr("class", "axis")
        .call(d3.svg.axis().scale(d3.scale.linear().domain([-500,500]).range([500, -500]))
            .tickValues([-400, -300, -200, -100, 100, 200, 300, 400]).orient('right'));

    //update second derivative
    specialCaseSD();
}

function restore(x1, y1, x2, y2, controlX, controlY){
    var newY1 = calculateNewY(x1, y1, controlX, controlY), newY2 = calculateNewY(controlX, controlY, x2, y2);

    //restore 2 points + line
    createLine("mainLine1", x1, newY1, x2, newY2, "pointAa", "pointCb");
    createPoint("pointAa", x1, newY1, "mainLine1");
    createPoint("pointCb", x2, newY2, "mainLine1");

    //update second derivative
    restoreSD(x1, newY1, x2, newY2);
}

///////////////////////////////Create/Derivative/Elements//////////////////////////////

function createLine(id, x1, y1, x2, y2, lp, rp){
    vizSVG.append("svg:line")
        .attr("id", id)
        .attr("class", "line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("leftPoint", lp)
        .attr("rightPoint", rp);
}

function createPoint(id, cx, cy, line){
    vizSVG.append("svg:circle")
        .attr("id", id)
        .attr("class", "dPoint")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", radius)
        .attr("line", line);
}
