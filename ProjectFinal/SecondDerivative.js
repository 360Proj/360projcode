
//global variables
//yScaleSD is a constant used to help visualize the second derivative because of
//scaling issues with the second derivative view
var undoArraySD = [], redoArraySD= [], yScaleSD = 25, radiusSD = 10;

//create + set pointer to SVG second derivative view
var secondDeriv = document.createElementNS("http://www.w3.org/2000/svg", "svg");


var vizSVGSecond = d3.select(secondDeriv)
    .attr("viewBox", "0 -500 1300 1000")
    .attr("preserveAspectRatio", "xMinYMid meet")
    .attr("id", "innerSvgSecond");

//x-axis
vizSVGSecond.append('g')
    .attr("class", "axis")
    .call(d3.svg.axis().scale(d3.scale.identity().domain([0,width]))
        .tickValues([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200]).orient('bottom'));


//y-axis
vizSVGSecond.append('g')
    .attr("class", "axis")
    .call(d3.svg.axis().scale(d3.scale.linear().domain([-500,500]).range([500,-500]))
        .tickValues([-400, -300, -200, -100, 100, 200, 300, 400]).orient('right'));


///////////////////////////////Update/Points/////////////////////////////////

function updateSDStart(point, X, Y, rPoint){
    var line = getReferenceElementDeriv(secondDeriv, point, 'line');
    var rightPoint = getReferenceElementDeriv(secondDeriv, line, 'rightPoint');
    var newY = calculateNewYSD(X, Y, rPoint.getAttribute('cx'), rPoint.getAttribute('cy'));

    d3.select(line).attr("x1", X).attr("y1", newY).attr("y2", newY);
    d3.select(point).attr("cx", X).attr("cy", newY);
    d3.select(rightPoint).attr("cy", newY);
}

function updateSDEnd(point, X, Y, lPoint){
    var line = getReferenceElementDeriv(secondDeriv, point, 'line');
    var leftPoint = getReferenceElementDeriv(secondDeriv, line, 'leftPoint');
    var newY = calculateNewYSD(lPoint.getAttribute('cx'), lPoint.getAttribute('cy'), X, Y);

    d3.select(line).attr('x2', X).attr('y1', newY).attr('y2', newY);
    d3.select(point).attr('cx', X).attr('cy', newY);
    d3.select(leftPoint).attr('cy', newY);
}

function updateSDControl(leftPoint, rightPoint, lPoint, rPoint){
    var line = getReferenceElementDeriv(secondDeriv, leftPoint, 'line');
    var newY= calculateNewYSD(lPoint.getAttribute('cx'), lPoint.getAttribute('cy'), rPoint.getAttribute('cx'), rPoint.getAttribute('cy'));

    d3.select(line).attr('y1', newY).attr('y2', newY);
    d3.select(leftPoint).attr('cy', newY);
    d3.select(rightPoint).attr('cy', newY);
}

///////////////////////////////////////Add///////////////////////////////////////

function addSDPoint(lPoint, rPoint, newPointA, newPointB){
    var leftPoint = getObEl(secondDeriv, lPoint.getAttribute('id')+'d'), rightPoint = getObEl(secondDeriv, rPoint.getAttribute('id')+'d');
    var newYA = calculateNewYSD(lPoint.getAttribute('cx'), lPoint.getAttribute('cy'), newPointB.getAttribute('cx'), newPointB.getAttribute('cy'));
    var newYB = calculateNewYSD(newPointA.getAttribute('cx'), newPointA.getAttribute('cy'), rPoint.getAttribute('cx'), rPoint.getAttribute('cy'));
    var lineId =  getReferenceElementDeriv(vizDOMElement, newPointA, 'line').getAttribute('id')+'d';

    //create new line + points
    createSDLine(lineId, newPointA.getAttribute('cx'),newYB, rPoint.getAttribute('cx'), newYB,
        newPointA.getAttribute('id')+'d', rPoint.getAttribute('id')+'d');
    createSDPoint(newPointA.getAttribute('id')+'d', newPointA.getAttribute('cx'), newYB, lineId);
    createSDPoint(newPointB.getAttribute('id')+'d', newPointB.getAttribute('cx'), newYA, leftPoint.getAttribute('line'));

    //change old lines x2 and y2 + right point reference
    d3.select(getReferenceElementDeriv(secondDeriv, leftPoint, 'line')).attr('x2', newPointB.getAttribute('cx')).attr('y2', newYA)
        .attr('y1', newYA).attr('rightPoint', newPointB.getAttribute('id')+'d');

    //set values
    d3.select(leftPoint).attr('cy', newYA);
    d3.select(rightPoint).attr('cy', newYB);
    rightPoint.setAttribute('line', lineId);


    moveToFront(rightPoint);
}

///////////////////////////////////////Remove//////////////////////////////////////////

function removeSDStartPoint(rPointId, lPointId){
    var thisPoint = getObEl(secondDeriv, 'pointAad'), rightPoint = getObEl(secondDeriv, rPointId+'d');
    var leftPoint = getObEl(secondDeriv, lPointId+'d');

    //remove line + both points
    d3.select(getReferenceElementDeriv(secondDeriv, thisPoint, 'line')).remove();
    d3.select(rightPoint).remove();
    d3.select(thisPoint).remove();

    //set references + new start point
    getReferenceElementDeriv(secondDeriv, leftPoint, 'line').setAttribute('leftPoint', 'pointAad');
    leftPoint.setAttribute('id', 'pointAad');
}

function removeSDEndPoint(rPointId, lPointId){
    var thisPoint = getObEl(secondDeriv, 'pointCbd'), leftPoint = getObEl(secondDeriv, lPointId+'d');
    var rightPoint = getObEl(secondDeriv, rPointId+'d');

    //remove line + both points
    d3.select(getReferenceElementDeriv(secondDeriv, thisPoint, 'line')).remove();
    d3.select(leftPoint).remove();
    d3.select(thisPoint).remove();

    //set references + new end point
    getReferenceElementDeriv(secondDeriv, rightPoint, 'line').setAttribute('rightPoint', 'pointCbd');
    rightPoint.setAttribute('id', 'pointCbd');
}

function removeSDMidPoint(id, leftPoint, rightPoint){
    var thisA = getObEl(secondDeriv, id+'ad'), thisB = getObEl(secondDeriv, id+'bd');
    var leftPointD = getObEl(secondDeriv, leftPoint.getAttribute('id')+'d'),
        rightPointD = getObEl(secondDeriv, rightPoint.getAttribute('id')+'d');
    var newY = calculateNewYSD(leftPoint.getAttribute('cx'), leftPoint.getAttribute('cy'),
        rightPoint.getAttribute('cx'), rightPoint.getAttribute('cy'));

    //remove line + both points
    d3.select(thisA).remove();
    d3.select(thisB).remove();
    d3.select(getReferenceElementDeriv(secondDeriv, rightPointD, 'line')).remove();

    //set new y-values for right path + points
    d3.select(getReferenceElementDeriv(secondDeriv, leftPointD, 'line')).attr('x2', rightPointD.getAttribute('cx'))
        .attr('y1', newY).attr('y2', newY);
    rightPointD.setAttribute('cy', newY);
    leftPointD.setAttribute('cy', newY);

    //connect references
    rightPointD.setAttribute('line', leftPointD.getAttribute('line'));
    getReferenceElementDeriv(secondDeriv, leftPointD, 'line').setAttribute('rightPoint', rightPointD.getAttribute("id"));

    moveToFront(rightPointD);

}

function removeSDPoints()
{
    d3.selectAll(".SDLine").remove();
    d3.selectAll(".SDPoint").remove();
    
}
/////////////////////////////////Undo/Redo///////////////////////////////////////

function addSDUndoState(){

    //push view unto undo stack
    undoArraySD.push(secondDeriv.cloneNode(true));

    //clear redoArray
    redoArraySD = [];
}

function undoSD(){

    //add view to redo array + replace current view
    redoArraySD.push(secondDeriv);
    var newView = undoArraySD.pop();

    //update view if the current view is on the second derivative
    if(getElement("secondDButton").disabled)
        getElement("main").replaceChild(newView, secondDeriv);

    //reset viz
    secondDeriv = newView;
    vizSVGSecond = d3.select(secondDeriv);
}

function redoSD(){

    //add current view to undo array + replace the current view
    undoArraySD.push(secondDeriv);
    var newView = redoArraySD.pop();

    //update view if the current view is on the second derivative
    if(getElement("secondDButton").disabled)
        getElement("main").replaceChild(newView, secondDeriv);

    //reset viz
    secondDeriv = newView;
    vizSVGSecond = d3.select(secondDeriv);
}

//////////////////////////////////New/Y/Value/////////////////////////////////////

function calculateNewYSD(leftX, leftY, rightX, rightY){
    return yScaleSD*(parseFloat(rightY) - parseFloat(leftY)) / (parseFloat(rightX) - parseFloat(leftX));
}

////////////////////////////////Special/Case/////////////////////////////////////

function specialCaseSD(){
    d3.selectAll(secondDeriv.childNodes).remove();

    //add x-axis back
    vizSVGSecond.append('g')
        .attr("class", "axis")
        .call(d3.svg.axis().scale(d3.scale.identity().domain([0,width]))
            .tickValues([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200]).orient('bottom'));

    //add y-axis back
    vizSVGSecond.append('g')
        .attr("class", "axis")
        .call(d3.svg.axis().scale(d3.scale.linear().domain([-500,500]).range([500,-500]))
            .tickValues([-400, -300, -200, -100, 100, 200, 300, 400]).orient('right'));
}

function restoreSD(x1, y1, x2, y2){
    var newY = calculateNewYSD(x1, y1, x2, y2);

    //restore 2 points + line
    createSDLine("mainLine1d", x1, newY, x2, newY, "pointAad", "pointCbd");
    createSDPoint("pointAad", x1, newY, "mainLine1d");
    createSDPoint("pointCbd", x2, newY, "mainLine1d");
}

//////////////////////////Create/Second/Derivative/Elements////////////////////////////////

function createSDPoint(id, cx, cy, line){
    vizSVGSecond.append("svg:circle")
        .attr("id", id)
        .attr("class", "SDPoint")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", radiusSD)
        .attr("line", line);
}

function createSDLine(id, x1, y1, x2, y2, lp, rp){
    vizSVGSecond.append("svg:line")
        .attr("id", id)
        .attr("class", "SDLine")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("leftPoint", lp)
        .attr("rightPoint", rp);
}
