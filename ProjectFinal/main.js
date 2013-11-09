/////////////////////////////////Main/Functions////////////////////////////

//returns element with specific id
function getElement(id){
    return document.getElementById(id);
}

//moves element to front of view
function moveToFront(el){
    el.parentNode.appendChild(el);
}

//get element from a specific object
function getObEl(ob, id){
    return ob.getElementById(id);
}

//return reference element
function getReferenceElement(element, attribute){
    return getElement(element.getAttribute(attribute));
}

//get the attribute of an element from a specific object
function getReferenceElementDeriv(obj, element, attribute){
    return getObEl(obj, element.getAttribute(attribute));
}