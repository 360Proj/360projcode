//Initialize global variables
var height = 1000, width = 1300, radius= 20;
var idGlobal = 0, hidden = false, undoArray = [], redoArray = [];

//Setup SVG main view
var vizSVGMain = d3.select("#viz")
    .append("svg")
    .attr("id", "main")
    .attr("width", width)
    .attr("height", height)
    .attr("transform", "translate(0,0)");

//x-axis
vizSVGMain.append('g')
    .attr("class", "axis")
    .call(d3.svg.axis().scale(d3.scale.identity().domain([0,width]))
        .tickValues([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200]).orient('bottom'));

//y-axis
vizSVGMain.append('g')
    .attr("class", "axis")
    .call(d3.svg.axis().scale(d3.scale.identity().domain([0,height]))
        .tickValues([100, 200, 300, 400, 500, 600, 700, 800, 900]).orient('right'));

//setup SVG function view
var vizSVG = vizSVGMain.append("svg")
    .attr("x", 0)
    .attr("y", 0)
    .attr("id", "innerSvg");

//////////////////////////////////////Move/Functions////////////////////////////////////////////////////

//move control point event
function moveControl(){
    moveToFront(this);
    var dragTarget = d3.select(this);
    var X = d3.event.dx  + parseInt(dragTarget.attr("cx"));
    var Y = d3.event.dy + parseInt(dragTarget.attr("cy"));

    var leftNode = getReferenceElement(getReferenceElement(this, "path"), "leftNodeId");
    var rightNode = getReferenceElement(getReferenceElement(this, "path"), "rightNodeId");

    //validate X is between points + Y value isn't off the screen
    X = boundsCheck(X, parseInt(leftNode.getAttribute("cx"))+radius, parseInt(rightNode.getAttribute("cx"))-radius);
    Y = boundsCheck(Y, 0+radius, height - radius);

    dragTarget.attr("cx", X).attr("cy", Y);                 //set points to new coordinate

    //update path + control lines
    updateBothDottedLines(getReferenceElement(this, "controlLineV"), getReferenceElement(this, "controlLineH"),"x2", "y2", X,Y);
    updatePathsControlPoint(getReferenceElement(this, "path"), X, Y);

    //update derivative
    top.Deriv.movedControl(leftNode, rightNode, X, Y);
}

//move for single point
function specialMove(){
    moveToFront(this);
    var dragTarget = d3.select(this);
    var X =  d3.event.dx + parseInt(dragTarget.attr("cx"));
    var Y =  d3.event.dy + parseInt(dragTarget.attr("cy"));

    X = boundsCheck(X, 0 + radius, width - radius);         //Check that X-coordinate is in the screen
    Y = boundsCheck(Y, 0 + radius, height - radius);        //Check that Y-coordinate is in the screen

    dragTarget.attr("cx", X).attr("cy", Y);                 //set points new coordinates
}

//move point event
function move(){
    moveToFront(this);
    var dragTarget = d3.select(this);
    var X =  d3.event.dx + parseInt(dragTarget.attr("cx"));
    var Y =  d3.event.dy + parseInt(dragTarget.attr("cy"));

    X = boundsCheck(X, 0 + radius, width - radius);         //Check that X-coordinate is in the screen
    Y = boundsCheck(Y, 0 + radius, height - radius);        //Check that Y-coordinate is in the screen


    var rightNode, rightPath, leftNode, leftPath, control1, control2;

    switch(this.getAttribute("id")){
        case "pointA":

            rightPath = getReferenceElement(this, "rightPathId");
            rightNode = getReferenceElement(rightPath, "rightNodeId");

            //validate points don't cross
            if(X >= parseInt(rightNode.getAttribute("cx")) - (radius*2)){
                X = parseInt(rightNode.getAttribute("cx")) - (radius*2);
            }

            dragTarget.attr("cx", X).attr("cy", Y);         //set points new coordinates

            //validate control point + update the path + update the control line
            controlValidation(getReferenceElement(rightPath, "controlCircle"), X, parseInt(rightNode.getAttribute("cx")), rightPath);
            updateNodeStart(rightPath, X, Y);
            updateSingleDottedLine(getReferenceElement(getReferenceElement(rightPath, "controlCircle"), "controlLineV"), X, Y);

            //update the derivative
            control1 = getReferenceElement(rightPath, "controlCircle");
            top.Deriv.movedStartPoint(X, Y, control1.getAttribute("cx"), control1.getAttribute("cy"));
            break;
        case "pointC":

            leftPath = getReferenceElement(this, "leftPathId");
            leftNode = getReferenceElement(leftPath, "leftNodeId");

            //validate points don't cross
            if(X <= parseInt(leftNode.getAttribute("cx")) + (radius*2)){
                X = parseInt(leftNode.getAttribute("cx")) + (radius*2);
            }

            dragTarget.attr("cx", X).attr("cy", Y);         //set points new coordinates

            //Validate control point + update the path + update the control line
            controlValidation(getReferenceElement(leftPath, "controlCircle"), parseInt(leftNode.getAttribute("cx")), X, leftPath);
            updateNodeEnd(leftPath, X, Y);
            updateSingleDottedLine(getReferenceElement(getReferenceElement(leftPath, "controlCircle"), "controlLineH"), X, Y);

            //update the derivative
            control1 = getReferenceElement(leftPath, "controlCircle");
            top.Deriv.movedEndPoint(X, Y, control1.getAttribute("cx"), control1.getAttribute("cy"));
            break;
        default:

            leftPath = getReferenceElement(this, "leftPathId");
            rightPath = getReferenceElement(this, "rightPathId");
            rightNode = getReferenceElement(rightPath, "rightNodeId");
            leftNode = getReferenceElement(leftPath, "leftNodeId");
            control1 = getReferenceElement(leftPath, "controlCircle");
            control2 = getReferenceElement(rightPath, "controlCircle");

            //validate points not crossing + validate control points
            X = boundsCheck(X, parseInt(leftNode.getAttribute("cx")) + (radius*2), parseInt(rightNode.getAttribute("cx")) - (radius*2));
            controlValidation(control1, parseInt(leftNode.getAttribute("cx")), X, leftPath);
            controlValidation(control2, X, parseInt(rightNode.getAttribute("cx")), rightPath);

            dragTarget.attr("cx", X).attr("cy", Y);         //set points new coordinates

            //Update the middle node's paths + control lines
            updateNodeEnd(leftPath, X, Y);
            updateNodeStart(rightPath, X, Y);
            updateBothDottedLines(getReferenceElement(control1, "controlLineH"), getReferenceElement(control2, "controlLineV"),"x1","y1",X,Y);

            //update the derivative
            top.Deriv.movedMidPoint(this.getAttribute("id"), X, Y, control1.getAttribute("cx"), control1.getAttribute("cy"), control2.getAttribute("cx"), control2.getAttribute("cy"));
    }
}

/////////////////////////////////////////Update/Elements/////////////////////////////////////////////////

//change starting coordinates of path
function updateNodeStart(element, x, y){
    var dArray = element.getAttribute("d").split(" ");
    element.setAttribute("d", [dArray[0], x, y, dArray[3], dArray[4], dArray[5], dArray[6], dArray[7]].join(" "));
}

//change ending coordinates of path
function updateNodeEnd(element, x, y){
    var dArray = element.getAttribute("d").split(" ");
    element.setAttribute("d", [dArray[0], dArray[1], dArray[2], dArray[3], dArray[4], dArray[5], x, y].join(" "));
}

//change control coordinates of path
function updatePathsControlPoint(path,X,Y){
    var dArray = path.getAttribute("d").split(" ");
    path.setAttribute('d', [dArray[0], dArray[1], dArray[2], dArray[3], X, Y, dArray[6], dArray[7]].join(" "));
}

//update the control circle + control lines
function updateControlCircle(circle, X, Y){
    circle.setAttribute("cx", X);
    circle.setAttribute("cy", Y);
    updateBothDottedLines(getReferenceElement(circle, "controlLineV"), getReferenceElement(circle, "controlLineH"), "x2", "y2", X, Y);
}

//update both control lines
function updateBothDottedLines(line1, line2, attrX, attrY, x, y){
    line1.setAttribute(attrX, x);
    line1.setAttribute(attrY, y);
    line2.setAttribute(attrX, x);
    line2.setAttribute(attrY, y);
}

//update just x1 + y1 of control line
function updateSingleDottedLine(line1, x, y){
    line1.setAttribute("x1", x);
    line1.setAttribute("y1", y);
}

/////////////////////////////////////Validation/////////////////////////////////////////////////

//checks to see if there is enough room to add a new point. If not it doesn't
//add the new point.
function addValidate(current, leftNode, rightNode){
    if((parseInt(rightNode.getAttribute('cx')) - radius)-(parseInt(current) + radius) < 0)
        return false;
    else if((parseInt(current) - radius)-(parseInt(leftNode.getAttribute('cx')) + radius) < 0)
        return false;
    return true;
}

//Checks if the control point is moved, if so it updates the path + dotted lines
function controlValidation(control, lower, upper, path){
    if(validateControl(control, lower, upper)){
        updatePathsControlPoint(path, control.getAttribute("cx"), control.getAttribute("cy"));
        updateBothDottedLines(getReferenceElement(control, "controlLineV"), getReferenceElement(control, "controlLineH"),
            "x2", "y2", control.getAttribute("cx"), control.getAttribute("cy"));

        //update derivative
        top.Deriv.movedControl(getReferenceElement(getReferenceElement(control, "path"), "leftNodeId"),
            getReferenceElement(getReferenceElement(control, "path"), "rightNodeId"),
            control.getAttribute("cx"), control.getAttribute("cy"));
    }
}

//validate that the control point is between its left and right
//point else set it to lower or higher
function validateControl(dot, lowerX, upperX){
    var dotx = dot.getAttribute("cx"), changed = false;
    var lowerX = lowerX + radius, upperX = upperX - radius;
    if(dotx <= lowerX){
        dot.setAttribute("cx", lowerX);
        changed = true;
    }
    if(dotx >= upperX){
        dot.setAttribute("cx", upperX);
        changed = true;
    }
    return changed;
}

//check if value is between lower and higher if not
//set point to lower or higher
function boundsCheck(value, lower, higher){
    if(parseInt(value) >= parseInt(higher)){
        value = higher;
    }
    if(parseInt(value) <= parseInt(lower)){
        value = lower;
    }
    return parseInt(value);
}

///////////////////////////////////////////Undo/Redo/////////////////////////////////////////////////

function addUndoState(){

    //push view onto undo stack
    undoArray.push(getElement("innerSvg").cloneNode(true));

    //clear redoArray
    redoArray = [];

    //add derivative undo state
    top.Deriv.addUndoState();

    //disable redo + enable undo button
    getElement("redoButton").disabled = true;
    getElement("undoButton").disabled = false;
}

function undo(){

    //add view to redo array + replace current view
    redoArray.push(getElement("innerSvg"));
    getElement("main").replaceChild(undoArray.pop(), getElement("innerSvg"));

    //reset viz + re-animate clone
    vizSVG = d3.select("#innerSvg");
    reAnimate();

    //hides or shows controls
    undoRedoControls();

    //undo derivative
    top.Deriv.undo();

    //Enable redo button + check undo stack
    getElement("redoButton").disabled = false;

    if(undoArray.length <= 0)
        getElement("undoButton").disabled = true;

}

function redo(){

    //add current view to undo array + replace the current view
    undoArray.push(getElement("innerSvg"));
    getElement("main").replaceChild(redoArray.pop(), getElement("innerSvg"));

    //reset viz
    vizSVG = d3.select("#innerSvg");

    //hides or shows controls
    undoRedoControls();

    //redo derivative
    top.Deriv.redo();

    //enable undo button + check the redo stack
    getElement("undoButton").disabled = false;

    if(redoArray.length <= 0)
        getElement("redoButton").disabled = true;
}

/////////////////////////////////////////Add/Remove/Points/////////////////////////////////////////


function add(){
    var rightNode = getReferenceElement(this, "rightNodeId"), leftNode = getReferenceElement(this, "leftNodeId");
	if(parseInt){
		if(d3.mouse){
			var X = parseInt(d3.mouse(this)[0]), Y = parseInt(d3.mouse(this)[1]);
		}
	}
	else
		var X = event.pageX, Y = event.pageY;

    //check if enough room to add new point
    if(!addValidate(X, leftNode, rightNode))
        return;


    addUndoState();
    idGlobal += 1;      //update id
    var oldControlX, newControlX;
    var controlCircle = getReferenceElement(this, "controlCircle");
	
	//Are we adding the new point to the left or right of the path's control point? true = left, false = right
	var smoothDir = getSmoothDirection(controlCircle, X);

    //get control x values for old and new control circles
    oldControlX = boundsCheck(controlCircle.getAttribute("cx"), parseInt(getReferenceElement(this, "leftNodeId").getAttribute("cx"))+radius, X-radius);
    newControlX = boundsCheck(controlCircle.getAttribute("cx"), X+radius, parseInt(rightNode.getAttribute("cx"))-radius);


    //Change this paths end points + update the control circle lines
    var dArray = d3.select(this).attr("d").split(" ");
    d3.select(this).attr("d", [dArray[0], dArray[1], dArray[2], "Q", oldControlX, dArray[5], X, Y].join(" "));
    updateControlCircle(controlCircle, oldControlX, controlCircle.getAttribute("cy"));
    updateSingleDottedLine(getReferenceElement(controlCircle, "controlLineH"), X, Y);


    //Create Control lines and points
    createControlLine("dotLineA"+idGlobal, X, Y, newControlX, dArray[5]);
    createControlLine("dotLineB"+idGlobal, rightNode.getAttribute("cx"), rightNode.getAttribute("cy"), newControlX, dArray[5]);
    createControlPoint("controlCircle"+idGlobal, newControlX, dArray[5], "Path"+idGlobal, "dotLineA"+idGlobal, "dotLineB"+idGlobal);

    //Hide controls if hidden is true
    checkIfHidden([getElement("dotLineA"+idGlobal), getElement("dotLineB"+idGlobal), getElement("controlCircle"+idGlobal)]);

    //Create Path and Point
    createPath("Path"+idGlobal, ["M", X, Y, "Q",newControlX, dArray[5], dArray[6], dArray[7]].join(" "), "Point"+idGlobal, rightNode.getAttribute('id'), "controlCircle"+idGlobal);
    createPoint("Point"+idGlobal, X, Y, this.getAttribute("id"), "Path"+idGlobal);


    //set references
    rightNode.setAttribute("leftPathId", "Path"+idGlobal);
    this.setAttribute("rightNodeId", "Point"+idGlobal);

    //Moves right node on top of line
    moveToFront(rightNode);

    //update derivative
    top.Deriv.addPoint(idGlobal, X, Y, leftNode, rightNode, controlCircle, getElement("controlCircle"+idGlobal));
	
	//Smooth graph after adding new point
	if(smoothDir)
		smoothing(getElement("controlCircle"+idGlobal));
	else
		smoothRight(getReferenceElement(getReferenceElement(getElement("Point"+idGlobal), "leftPathId"), "controlCircle"));
}

function remove(){

   	if(typeof event != 'undefined') window.event.preventDefault();         //prevent context menu showing

    var rightPath, leftPath, rightNode, leftNode, controlC;

    switch(this.getAttribute("id")){
        case "pointA":

            rightPath = getReferenceElement(this, "rightPathId");
            rightNode = getReferenceElement(rightPath, "rightNodeId");
            var rightId = rightNode.getAttribute("id");

            //if only 2 points create special point (single point) and return
            if(rightNode.getAttribute("id") == "pointC"){
                specialCase(rightNode.getAttribute("cx"), rightNode.getAttribute("cy"));
                return;
            }

            //set right point to new start point + set references
            getReferenceElement(rightNode, "rightPathId").setAttribute("leftNodeId", "pointA");
            rightNode.setAttribute("leftPathId", null);
            rightNode.setAttribute("id", "pointA");

            //Remove control circle + control lines
            controlC = getReferenceElement(rightPath, "controlCircle");
            removeControlElements(controlC, rightPath);

            d3.select(this).remove();       //remove point

            //remove derivative
            top.Deriv.removeStartPoint(rightId);
            break;

        case "pointC":

            leftPath = getReferenceElement(this, "leftPathId");
            leftNode = getReferenceElement(leftPath, "leftNodeId");
            var leftId = leftNode.getAttribute("id");

            //if only 2 points create special point (single point) and return
            if(leftNode.getAttribute("id") == "pointA"){
                specialCase(leftNode.getAttribute("cx"), leftNode.getAttribute("cy"));
                return;
            }

            //set left point to new end point + set references
            getReferenceElement(leftNode, "leftPathId").setAttribute("rightNodeId", "pointC");
            leftNode.setAttribute("rightPathId", null);
            leftNode.setAttribute("id", "pointC");

            //Remove control circle + control lines
            controlC = getReferenceElement(leftPath, "controlCircle");
            removeControlElements(controlC, leftPath);

            d3.select(this).remove();       //remove point

            //remove derivative
            top.Deriv.removeEndPoint(leftId);
            break;

        default:

            rightPath = getReferenceElement(this, "rightPathId");
            rightNode = getReferenceElement(rightPath, "rightNodeId");
            leftPath = getReferenceElement(this, "leftPathId");
            var thisId = this.getAttribute('id');

            //Remove control circle + control lines
            controlC = getReferenceElement(rightPath, "controlCircle");
            removeControlElements(controlC, rightPath);

            //update control line + end coordinates of path
            updateSingleDottedLine(getReferenceElement(getReferenceElement(leftPath, "controlCircle"), "controlLineH"), rightNode.getAttribute("cx"), rightNode.getAttribute("cy"));
            updateNodeEnd(leftPath, rightNode.getAttribute("cx"), rightNode.getAttribute("cy"));

            //set references
            rightNode.setAttribute("leftPathId", this.getAttribute("leftPathId"));
            leftPath.setAttribute("rightNodeId", rightNode.getAttribute("id"));

            moveToFront(rightNode);

            d3.select(this).remove();           //remove point

            //remove derivative
            top.Deriv.removeMidPoint(thisId, getReferenceElement(leftPath, "controlCircle"), getReferenceElement(leftPath, "leftNodeId"), rightNode);
            break;
    }
}

//////////////////////////////////Special/Case/(Single Point)/////////////////////////////////////////

//have a single point
function specialCase(cx, cy){

    d3.selectAll(getElement("innerSvg").childNodes).remove();
    createSpecialPoint(cx, cy);

    //update derivative
    top.Deriv.specialCase();
}

//move from 1 to 2 points
function restore(){

   	if(typeof event != 'undefined') event.preventDefault();          //prevent context menu showing

    //validate 2nd point is in bounds
    var X = parseInt(this.getAttribute("cx")), Y = parseInt(this.getAttribute("cy"));
    var controlY = Y + 100;
    if(X+100+radius >= width)
        X -= 100;
    if(controlY+radius >= height)
        controlY = Y - 100;

    //recreate 2 point view
    createControlLine("dotLine1V", X, Y, X+50, controlY);
    createControlLine("dotLine1H", X+100, Y, X+50, controlY);
    createControlPoint("controlCircleMain1", X+50, controlY, "mainPath1", "dotLine1V", "dotLine1H");
    createPath("mainPath1", ["M", X, Y, "Q", X+50, controlY, X+100, Y].join(" "), "pointA", "pointC", "controlCircleMain1");
    createPoint("pointA", X, Y, null, "mainPath1");
    createPoint("pointC", X+100, Y, "mainPath1", null);

    d3.select(this).remove();       //remove special point

    //update Derivative
    top.Deriv.restore(X,Y, X+100, Y, X+50, controlY);
}

//////////////////////////////////////Smoothing/Calculation/////////////////////////////////////////////

function smoothingCalculation(thisX, thisY, leftNodeX, leftNodeY, leftContX){
    return parseFloat(thisY) + ((parseFloat(leftNodeY) - parseFloat(thisY))/(parseFloat(thisX) - parseFloat(leftNodeX)))*
        parseFloat(thisX) + ((parseFloat(thisY) - parseFloat(leftNodeY))/(parseFloat(thisX) - parseFloat(leftNodeX))) * parseFloat(leftContX);
}

function smoothing(el){

    if(typeof event != 'undefined') event.preventDefault();          //prevent context menu showing

    if (el != null){
        var X = el.getAttribute('cx');
        var Y = el.getAttribute('cy');
        var leftNode = getReferenceElement(getReferenceElement(el, 'path'), 'leftNodeId');
    }

    else{
        var X = this.getAttribute('cx');
        var Y = this.getAttribute('cy');
        var leftNode = getReferenceElement(getReferenceElement(this, 'path'), 'leftNodeId');
    }

    if(leftNode.getAttribute('id') == 'pointA')      //if left node is start can't smooth
        return;

    var leftPath = getReferenceElement(leftNode, 'leftPathId');
    var leftPointControl = getReferenceElement(leftPath, 'controlCircle');

    //calculate newY + check its in bounds
    var newY = smoothingCalculation(X,Y,leftNode.getAttribute('cx'),leftNode.getAttribute('cy'),leftPointControl.getAttribute('cx'));
    newY = boundsCheck(newY, 0 + radius, height - radius);

    //update controls + path
    updateControlCircle(leftPointControl, leftPointControl.getAttribute('cx'), newY);
    updatePathsControlPoint(leftPath, leftPointControl.getAttribute('cx'), newY);

    //update Derivative
    top.Deriv.movedControl(getReferenceElement(leftPath, 'leftNodeId'), leftNode, leftPointControl.getAttribute('cx'), newY);
}

//Function to smooth all points from left to right
function smoothAllMac(){
    //Gather all elements and their x co-ordinates into arrays
    var els = [];
    var xpoints = [];

    els[1] = getElement("controlCircleMain2");

    xpoints[1] = els[1].getAttribute("cx");  
    var i = 1
    var zeroOut = 1;

    if (getElement("controlCircle1") != null){
        i = 2;
    }

    while(getElement("controlCircle"+(i-1)) != null){
        els[i] = getElement("controlCircle"+(i-1));
        xpoints[i] = els[i].getAttribute("cx");
        i++;
    }

    addUndoState();

    //performs smooth on each point from right to left on the graph. (as if you right clicked each point)
    for (var k = 1; k <= i ; k++){
        var curElx = null;

        for(var j = 1; j <= i; j++){
            if (xpoints[j] > curElx){
                curElx = xpoints[j];
                zeroOut = j;
            }
        }

        xpoints[zeroOut] = 0;
        smoothing(els[zeroOut]);
    }
}

//Function to smooth all points from left to right
function smoothAllPC() {

	//Get the right most control point
	var pointC = getElement("pointC");
	var cur_control = getReferenceElement(getReferenceElement(pointC, "leftPathId"), "controlCircle");
	var leftNode = getReferenceElement(getReferenceElement(cur_control, 'path'), 'leftNodeId');	
	
	//Add undo state
	if(leftNode.getAttribute("id") != "pointA")
		addUndoState();
	
	while(leftNode.getAttribute("id") != "pointA") { //continue smoothing points until we've reached the leftmost control
		//Recycle smoothAdd function.  There's some redundancy in node checking
		//but it does what we want without rewriting the smooth function
		smoothing(cur_control); 
		cur_control = getReferenceElement(getReferenceElement(leftNode, "leftPathId"), "controlCircle");
		leftNode = getReferenceElement(getReferenceElement(cur_control, 'path'), 'leftNodeId');
	}
} 

//Smooth from left to right instead of right to left
function smoothRight(cpoint){

 	var X = cpoint.getAttribute('cx');
    var Y = cpoint.getAttribute('cy');
    var rightNode = getReferenceElement(getReferenceElement(cpoint, 'path'), 'rightNodeId');

    if(rightNode.getAttribute('id') == 'pointC')      //if right node is end we can't smooth
        return;

    var rightPath = getReferenceElement(rightNode, 'rightPathId');
    var rightPointControl = getReferenceElement(rightPath, 'controlCircle');

    //calculate newY + check its in bounds
    var newY = smoothingCalculation(X,Y,rightNode.getAttribute('cx'),rightNode.getAttribute('cy'),rightPointControl.getAttribute('cx'));
    newY = boundsCheck(newY, 0 + radius, height - radius);

    //update controls + path
    updateControlCircle(rightPointControl, rightPointControl.getAttribute('cx'), newY);
    updatePathsControlPoint(rightPath, rightPointControl.getAttribute('cx'), newY);
	
    //update Derivative
    top.Deriv.movedControl(getReferenceElement(rightPath, 'rightNodeId'), rightNode, rightPointControl.getAttribute('cx'), newY);
}

function getSmoothDirection(control, X) {

	ctrlX = control.getAttribute("cx");
	return X < ctrlX; //true = smooth left, false = smooth right
}
///////////////////////////////////////Misc/Functions///////////////////////////////////////////////////

//Add actions to clone
function reAnimate(){
    d3.selectAll(".point").on("contextmenu", remove).call(d3.behavior.drag().on("dragstart", addUndoState).on("drag", move));
    d3.selectAll(".specialPoint").on("contextmenu", restore).call(d3.behavior.drag().on("dragstart", addUndoState).on("drag", specialMove));
    d3.selectAll(".controlPoint").on("contextmenu", smoothing).call(d3.behavior.drag().on("dragstart", addUndoState).on("drag", moveControl));
    d3.selectAll(".path").on("click", add);
}

//Hide/show control points
function hideControl(){
    if(hidden){
        d3.selectAll(".controlPoint").style("visibility", "visible");
        d3.selectAll(".controlLine").style("visibility", "visible");
        hidden = false;
        getElement("hideControls").value = "Hide Controls"
    }else {
        d3.selectAll(".controlPoint").style("visibility", "hidden");
        d3.selectAll(".controlLine").style("visibility", "hidden");
        hidden = true;
        getElement("hideControls").value = "Show Controls"
    }
}

//remove control elements + path
function removeControlElements(control, path){
    d3.select(getReferenceElement(control, "controlLineV")).remove();
    d3.select(getReferenceElement(control, "controlLineH")).remove();
    d3.select(control).remove();
    d3.select(path).remove();
}

//if controls are hidden hide new controls
function checkIfHidden(controls){
    if(hidden)
        d3.selectAll(controls).style("visibility", "hidden");
}

//on undo/redo state hide/show controls based on if hidden
function undoRedoControls(){
    if(!hidden){
        d3.selectAll(".controlPoint").style("visibility", "visible");
        d3.selectAll(".controlLine").style("visibility", "visible");
    }else{
        d3.selectAll(".controlPoint").style("visibility", "hidden");
        d3.selectAll(".controlLine").style("visibility", "hidden");
    }
}

///////////////////////////////////////////Save/Load Functions///////////////////////////////////////////////////

function save() {
	var masterFile = new Array();
	var con_line, con_point, path, point; //Strings containing object information
	
	var A_NODE = getElement("pointA");
	var TEMP_NODE = A_NODE;
	
	//Build control line data, control point data, point data and path data
	while(TEMP_NODE.getAttribute("id") != "pointC"){
		var TEMP_PATH = getReferenceElement(TEMP_NODE, "rightPathId");
		var TEMP_CON_CIRCLE = getReferenceElement(TEMP_PATH, "controlCircle");
		var TEMP_CON_LINE_1 = getReferenceElement(TEMP_CON_CIRCLE, "controlLineV");
		var TEMP_CON_LINE_2 = getReferenceElement(TEMP_CON_CIRCLE, "controlLineH");
		
		con_line += "" + TEMP_CON_LINE_1.getAttribute("id");
		con_line += " " + TEMP_CON_LINE_1.getAttribute("x1");
		con_line += " " + TEMP_CON_LINE_1.getAttribute("y1");
		con_line += " " + TEMP_CON_LINE_1.getAttribute("x2");
		con_line += " " + TEMP_CON_LINE_1.getAttribute("y2");
		con_line += " " + TEMP_CON_LINE_2.getAttribute("id");
		con_line += " " + TEMP_CON_LINE_2.getAttribute("x1");
		con_line += " " + TEMP_CON_LINE_2.getAttribute("y1");
		con_line += " " + TEMP_CON_LINE_2.getAttribute("x2");
		con_line += " " + TEMP_CON_LINE_2.getAttribute("y2") + " ";
		
		con_point += ""  + TEMP_CON_CIRCLE.getAttribute("id");
		con_point += " " + TEMP_CON_CIRCLE.getAttribute("cx");
		con_point += " " + TEMP_CON_CIRCLE.getAttribute("cy");
		con_point += " " + TEMP_CON_CIRCLE.getAttribute("path"); //Path is a long string variable so this is wrapped in quotes. May need to be changed
		con_point += " " + TEMP_CON_CIRCLE.getAttribute("controlLineV");
		con_point += " " + TEMP_CON_CIRCLE.getAttribute("controlLineH") + " ";
		
		path += "" + TEMP_PATH.getAttribute("id");
		path += " \"" + TEMP_PATH.getAttribute("d");	//Path is a long string variable so this is wrapped in quotes. May need to be changed
		path += "\" " + TEMP_PATH.getAttribute("leftNodeId");
		path += " " + TEMP_PATH.getAttribute("rightNodeId");
		path += " " + TEMP_PATH.getAttribute("controlCircle") + " ";
		
		point += "" + TEMP_NODE.getAttribute("id");
		point += " " + TEMP_NODE.getAttribute("cx");
		point += " " + TEMP_NODE.getAttribute("cy");
		if(TEMP_NODE.getAttribute("id") != "pointA")
			point += " " + TEMP_NODE.getAttribute("leftPathId");
		else
			point += " null";
		point += " " + TEMP_NODE.getAttribute("rightPathId") + " ";
		
		TEMP_NODE = getReferenceElement(getReferenceElement(TEMP_NODE, "rightPathId"), "rightNodeId");
	}
	
	//fill in where temp node = pointC
	point += "" + TEMP_NODE.getAttribute("id");
	point += " " + TEMP_NODE.getAttribute("cx");
	point += " " + TEMP_NODE.getAttribute("cy");
	point += " " + TEMP_NODE.getAttribute("leftPathId");
	point += " null";
		
	masterFile[0] = "" + con_line + con_point + path + point;
	
	var blob = new Blob(masterFile, {type: "text/plain;charset=utf-8"});
	saveAs(blob, "SVG_Graph.txt");
}

function load() {

    var fileInput = document.getElementById('file');
    var fileDisplayArea = document.getElementById('test');
    var graphinfo;

    //Load file and tranlate into graph
    fileInput.addEventListener('change', function(e) {
      var file = fileInput.files[0];
            var textType = /text.*/;

            if (file.type.match(textType)) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    //remove all points

                    d3.selectAll(".controlLine").remove();
                    d3.selectAll(".controlPoint").remove();
                    d3.selectAll(".path").remove();
                    d3.selectAll(".point").remove();
                    top.Deriv.removePoints();

                    graphinfo = reader.result;
                    graphinfo = graphinfo.replace("undefined", "");
                    graphinfo = graphinfo.split(" ");

                    var i = 0;
                    while(graphinfo[i].substring(0, 7) == "dotLine"){
                        createControlLine(graphinfo[i], graphinfo[i+1], graphinfo[i+2], graphinfo[i+3], graphinfo[i+4]);
                        i+=5;
                        graphinfo[i] = graphinfo[i].replace("undefined", "");
                    }

                    while(graphinfo[i].substring(0, 14).search("controlCircle") != -1){
                        createControlPoint(graphinfo[i], graphinfo[i+1], graphinfo[i+2], graphinfo[i+3], graphinfo[i+4], graphinfo[i+5]);
                        i+=6;
                        graphinfo[i] = graphinfo[i].replace("undefined", "");
                    }

                    while(graphinfo[i].substring(0, 10).search("Path") != -1){
                        createPath(graphinfo[i], [graphinfo[i+1].substring(1), graphinfo[i+2], graphinfo[i+3], graphinfo[i+4], graphinfo[i+5], graphinfo[i+6], graphinfo[i+7], graphinfo[i+8].substring(0, graphinfo[i+8].length - 1)].join(" "), graphinfo[i+9], graphinfo[i+10], graphinfo[i+11]);
                        i+=12;
                        graphinfo[i] = graphinfo[i].replace("undefined", "");
                    }
                    while(graphinfo[i] != null && graphinfo[i].substring(0, 6).search(/point/i) != -1){
						if(graphinfo[i] == "pointA")
							createPoint(graphinfo[i], graphinfo[i+1], graphinfo[i+2], null, graphinfo[i+4]);
						else if(graphinfo[i] == "pointC")
							createPoint(graphinfo[i], graphinfo[i+1], graphinfo[i+2], graphinfo[i+3], null);
						else
							createPoint(graphinfo[i], graphinfo[i+1], graphinfo[i+2], graphinfo[i+3], graphinfo[i+4]);
                        i+=5;
                    }
					
				    vizSVG = d3.select("#innerSvg");
					reAnimate();
                }

                reader.readAsText(file);    
            } else {
                fileDisplayArea.innerText = "File not supported!"
            }
    });   
}

/////////////////////////////////////Create/Function/Objects///////////////////////////////////////////////////

function createControlLine(id,x1,y1,x2,y2){
    vizSVG.append("svg:line")
        .attr("id", id)
        .attr("class", "controlLine")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2);
}

function createControlPoint(id, cx, cy, path, controlLineV, controlLineH){
    vizSVG.append("svg:circle")
        .attr("id", id)
        .attr("class", "controlPoint")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", radius)
        .attr("path", path)
        .attr("controlLineV", controlLineV)
        .attr("controlLineH", controlLineH)
        .on("contextmenu", smoothing)
        .call(d3.behavior.drag().on("dragstart", addUndoState).on("drag", moveControl));
}

function createPath(id, d, leftNodeId, rightNodeId, controlCircle){
    vizSVG.append("svg:path")
        .attr("id", id)
        .attr("class", "path")
        .attr("d", d)
        .attr("leftNodeId", leftNodeId)
        .attr("rightNodeId", rightNodeId)
        .attr("controlCircle", controlCircle)
        .on("click", add);
}
function createPoint(id, cx, cy, leftPathId, rightPathId){
    vizSVG.append("svg:circle")
        .attr("id", id)
        .attr("class", "point")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", radius)
        .attr("leftPathId", leftPathId)
        .attr("rightPathId", rightPathId)
        .on("contextmenu", remove)
        .call(d3.behavior.drag().on("dragstart", addUndoState).on("drag", move));
}
function createSpecialPoint(cx, cy){
    vizSVG.append("svg:circle")
        .attr("id", "specialPoint")
        .attr("class", "specialPoint")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", radius)
        .on("contextmenu", restore)
        .call(d3.behavior.drag().on("dragstart", addUndoState).on("drag", specialMove));
}
