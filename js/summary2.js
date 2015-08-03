var sliderValue, sectionSize;
var containerSize,stack, area;
var trColor = ["rgb(251,128,144)", "rgb(255,255,179)", "rgb(141,211,199)", "rgb(255,255,255)"],
	eventType = ["Negative","Neutral","Positive"];
var offsetType = "silhouette",//"wiggle",
    interpolationType = "cardinal";
var containerWidth=920,
	containerHeight=600,
	margin = {top: 30, right: 30, bottom: 20, left: 90},
	width = containerWidth - margin.left - margin.right,
	height = containerHeight - margin.top - margin.bottom;
var width, height, x, y, yValues, minX, maxX, xAxis, yAxis, yValues, trminX, trmaxX, tr_x, tr_y;
var minXValue, maxXValue, xRange, sectionLineX=[];
var g, svg, listOfSession;
var drag, dragging={};
var sessions = "1,2,3,4,5,6,7,8,9,10,11,12,13,14";
var sessionArr = sessions.split(",");
var dataFiltered = [];

$(document).ready(function (){
	load();
})

function load(){
	
	d3.json("data/test2.json", function(error, dataAll) {
		if(error){
			console.log(error);
			alert("Data can't be loaded");
		}else{
			
			dataAll.forEach( function(d){
				d.x = +d.x;
			});
			
			
			data = dataAll;
			data = filterSessions();
			
			listOfSession = d3.set(data.map(function(d){return d.sessionName;})).values();
			
						
			// Draw Slider
			d3.select('#slider')
			  .call(d3.slider()
						.axis(d3.svg.axis().ticks(6))
						.min(0)
						.max(30)
						.on("slide", function(evt, value) {
								sliderValue = Math.round(value);
								d3.select('#slider3text').text(sliderValue);

								d3.select("#chartContainer").select("svg").remove();	
								sectionWidth = width/sliderValue;
								drawGraph();
							}));
			
		}
				
	});
	
	

}

function drawGraph(){
	
	groupData();
	defineStackFunction();
	defineAreaFunction();
			
	// ========================= Data Initialization =============================
	for(var i = 1; i <=sliderValue; i++){
		
		window['newDataPosArea'+i] = window['dataArea'+i].filter(isPositive),
		window['newDataNetArea'+i] = window['dataArea'+i].filter(isNeutral),
		window['newDataNegArea'+i] = window['dataArea'+i].filter(isNegative);
		
		window['dataCombinedArea'+i] = [{type:eventType[0], dataArr: window['newDataNegArea'+i], color:trColor[0]},
										{type:eventType[1], dataArr: window['newDataNetArea'+i], color:trColor[1]},
										{type:eventType[2], dataArr: window['newDataPosArea'+i], color:trColor[2]}];
		
		
		window['stackData'+i] = stack(window['dataCombinedArea'+i]);
		
	}

	
	// ========================= Draw Chart =============================
	
			
	//Define line to separate sections
	defineSectionLine();
	initAxis();
	
	// Append canvas
	svg = d3.select("#chartContainer").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	//console.log(sliderValue);
	for(var i = 1; i <=sliderValue; i++){
		container = svg.append("g")
					   .attr('class','chart'+i);
					   
		container.selectAll("path")
			.data(window['stackData'+i])
			.enter().append("path")
			.attr("d", function(d) { return area(d.dataArr); })
			.style("fill", function(d) { return d.color; })
			.append("title")
			.text(function(d) { return d.type; });
		
		window['maxYAfterStacked'+i] = getMaxY2(window['stackData'+i]);
		svg.selectAll('.chart'+i).attr("transform", function(d){ return "translate("+ (tr_x((trmaxX/2)-(window['maxYAfterStacked'+i]/2))+(i-1)*sectionWidth) + "," + 0 + ")"; });
		//console.log(tr_x((trmaxX/2)-(window['maxYAfterStacked'+i]/2))+(i*sectionWidth));
		console.log((i-1)*sectionWidth);
	}
	
	// draw x axis
	svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")
	.call(xAxis);
	
	// draw y axis
	svg.append("g")
	.attr("class", "y axis")
	.call(yAxis);
	
	defineDragFunction();
	
	
	
	// Add a group element for each section.
	g = svg.selectAll(".section")
		  .data(sectionLineX)
		.enter().append("svg:g")
		  .attr("class", "section")
		  .attr("transform", function(d) { return "translate(" + x(d.x) + ")"; })
		  .call(drag);
	
	// Add section line and title.
	g.append("svg:g")
		  .attr("class", "axis")
		  .each(function(d) { d3.select(this).call(axis) })
		.append("svg:text")
		  .attr("text-anchor", "middle")
		  .attr("y", -9)
		  .text(function(d) {return d.text;});
	
	
}

function defineDragFunction(){
	drag = d3.behavior.drag()
			.on("drag", function(d) {
				
				d.x = x2(d3.event.x);
				d.text = round(d.x,2);
				d3.select(this)
					.attr("transform", function(d) { return "translate(" + d3.event.x + ")"; })
					.selectAll("text").text(function(d){ return d.text;});
				
			});
}

function position(d) {
  var v = dragging[d];
  return v == null ? x(d.x) : v;
}

function transition(g) {
  return g.transition().duration(500);
}

function initAxis(){
		
	// Set Y Axis
	// Define scale
	yValues = d3.set(data.map(function (d) { return d.sessionName; }))
				.values()
				.sort(function compareString(a,b){
						if (parseInt(a)<parseInt(b))
							return 1;
						if (parseInt(a)>parseInt(b))
							return -1;
							
						return 0;
					});
					
	
	y = d3.scale.ordinal()
		.domain(yValues)
		.rangePoints([height, 0],0);
	
	sectionLine = d3.scale.linear()
					.range([height,0])
					.domain(yValues);

	// Set X axis for the chart
	x = d3.scale.linear().range([0, width]),
	minX = d3.min(data, function(d) {return parseFloat(d.x);}),
	maxX = d3.max(data, function(d) {return parseFloat(d.x);}),
	x.domain([minX, maxX]);
	
	// Set scale to get x value from dragging position
	x2 = d3.scale.linear().range([minX,maxX]).domain([0,width]);
	
	// Set scale for each theme river graph
	// Get minimum and maximum x value for all area
	// Final x value is calculated from initial y and y0 value since the chart is vertical
	tr_y = d3.scale.linear().range([height, 0]);
	tr_y.domain([d3.max(yValues), 1]);
	
	trminX = getMinY(),
	trmaxX = getMaxY();
	tr_x = d3.scale.linear()
				.range([0, sectionSize])
				.domain([trminX-1, trmaxX+1]);
	
	xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.ticks(0);
	
	yAxis = d3.svg.axis()
				.scale(y)
				.tickFormat(function(d) { return "Session " + d;})
				.orient("left");
				
	axis = d3.svg.axis()
				.scale(sectionLine)
				.tickFormat("")
				.orient("left");


}

function defineSectionLine(){
	// Calculate sectionSize based on the number of section (sliderValue)
	sectionSize = width/sliderValue;
	
	// Calculate x range for each section
	minXValue = d3.min(data, function(d) {return parseFloat(d.x);});
	maxXValue = d3.max(data, function(d) {return parseFloat(d.x);});
	xRange = (maxXValue - minXValue) / sliderValue;
	
	// Put the line of each section in an array
	sectionLineX.length = 0;
	sectionLineX.push({x:minXValue, text:round(minXValue,2), linePos: 0});
	for(var i=1; i<=sliderValue; i++){
		xline = sectionLineX[i-1].x+xRange;
		sectionLineX.push({x:xline, text: round(xline,2), linePos: i});
	}

}

// Function to round number to the nearest integer
function round(value, exp) {
	if (typeof exp === 'undefined' || +exp === 0)
		return Math.round(value);

	value = +value;
	exp  = +exp;

	if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
		return NaN;

	// Shift
	value = value.toString().split('e');
	value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

	// Shift back
	value = value.toString().split('e');
	return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}

function filterSessions(){
	var filtered = [];
	for(var i = 0; i < sessionArr.length; i++){
		filtered = filtered.concat(data.filter(function(d) { return d.sessionName == sessionArr[i] }));
	}
	
	return filtered;

}

function defineAreaFunction(){
	area = d3.svg.area()
		.interpolate(interpolationType)
		.y(function(d) { return y(d.sessionName); })
		.x0(function(d) { return tr_x(d.y0); })
		.x1(function(d) { return tr_x(d.y0 + d.y); });
	
}

function defineStackFunction(){
	// Define the stack
	stack = d3.layout.stack()
			.offset(offsetType)
			.values(function(d) { return d.dataArr; })
			.x(function(d){return d.sessionName;})
			.y(function(d){return d.noOfEvent;});
			
}

function getMinY(){
	// Calculate min y value for all area 
	var minYValue = 0;
	for(var j = 1; j <=sliderValue; j++){
		for(var i = 0; i < window['dataCombinedArea'+j].length; i++){
			//console.log(d3.min(window['dataCombinedArea'+j][i].dataArr, function(d) { return d.y + d.y0; }));
			if( minYValue > d3.min(window['dataCombinedArea'+j][i].dataArr, function(d) { return d.y + d.y0; })){
				minYValue = d3.min(window['dataCombinedArea'+j][i].dataArr, function(d) { return d.y + d.y0; });
			}
		}
	}
	
	return minYValue;
}

function getMaxY(){
	// Calculate max y value for all area
	var maxYValue = 0;
	for(var j = 1; j <=sliderValue; j++){
		for(var i = 0; i < window['dataCombinedArea'+j].length; i++){
			if( maxYValue < d3.max(window['dataCombinedArea'+j][i].dataArr, function(d) { return d.y + d.y0; })){
				maxYValue = d3.max(window['dataCombinedArea'+j][i].dataArr, function(d) { return d.y + d.y0; });
			}
		}
	}
	
	return maxYValue;
}

function getMaxY2(inputArray){
	var maxYValue = 0;

	for(var i = 0; i < inputArray.length; i++){
		if( maxYValue < d3.max(inputArray[i].dataArr, function(d) { return d.y + d.y0; })){
			maxYValue = d3.max(inputArray[i].dataArr, function(d) { return d.y + d.y0; });
		}
	}

	return maxYValue;
}

function groupData(){

	// Calculate sectionSize based on the number of section (sliderValue)
	//sectionSize = containerWidth/sliderValue;
	
	// Calculate x range for each section
	minXValue = d3.min(data, function(d) {return parseFloat(d.x);});
	maxXValue = d3.max(data, function(d) {return parseFloat(d.x);});
	xRange = (maxXValue - minXValue) / sliderValue;
	
	// Put the line of each section in an array
	sectionLineX.length = 0;
	sectionLineX.push(minXValue);
	for(var i=1; i<=sliderValue; i++){
		sectionLineX.push(sectionLineX[i-1]+xRange);
	}

	// Define text to be shown on x axis
	/*xAxisText.length = 0;
	for(var i=0; i< sectionLineX.length-1; i++){
		xAxisText.push(round(sectionLineX[i],1)+" to "+round(sectionLineX[i+1],1));
	}*/
	
	//listOfSession = d3.set(data.map(function(d){return d.sessionName;})).values();
	
	// Group the number of events based on the section, session, and eventType
	var dataPerSession = [];
	var listNegative =[], listPositive = [], listNeutral = [];
	
	// Initialize variable to store data for each area
	for(var j= 1; j<=sliderValue; j++){
			window['dataArea'+j] = [];
	}
	
	for(var i=0; i<listOfSession.length; i++){
		dataPerSession = data.filter(function(d) { return d.sessionName == listOfSession[i];});
		//console.log("total number of events: "+dataPerSession.length);
		
		// Clean the list
		listNegative.length = 0;
		listPositive.length = 0;
		listNeutral.length = 0;
		
		// initiate array
		for(var j=0; j<sectionLineX.length-1; j++){
			listNegative.push(0);
			listPositive.push(0);
			listNeutral.push(0);
		}
		
		if(sectionLineX.length==2){
			for(var j=0; j<dataPerSession.length; j++){
				if(dataPerSession[j].eventCat=="Positive"){
					listPositive[0] = listPositive[0] + 1;
				}
				if(dataPerSession[j].eventCat=="Neutral"){
					listNeutral[0] = listNeutral[0] + 1;
				}
				if(dataPerSession[j].eventCat=="Negative"){
					listNegative[0] = listNegative[0] + 1;
				}
			}
		}else if(sectionLineX.length==3){
			for(var j=0; j<dataPerSession.length; j++){
				if( dataPerSession[j].x <= sectionLineX[1] ){
					if(dataPerSession[j].eventCat=="Positive"){
						listPositive[0] = listPositive[0] + 1;
					}
					if(dataPerSession[j].eventCat=="Neutral"){
						listNeutral[0] = listNeutral[0] + 1;
					}
					if(dataPerSession[j].eventCat=="Negative"){
						listNegative[0] = listNegative[0] + 1;
					}
				}
				
				if(dataPerSession[j].x > sectionLineX[1]){
					if(dataPerSession[j].eventCat=="Positive"){
						listPositive[1] = listPositive[1] + 1;
					}
					if(dataPerSession[j].eventCat=="Neutral"){
						listNeutral[1] = listNeutral[1] + 1;
					}
					if(dataPerSession[j].eventCat=="Negative"){
						listNegative[1] = listNegative[1] + 1;
					}
				}
			}
		}else{
			for(var j=0; j<dataPerSession.length; j++){
				// Check in which section the current x value falls within
				
				// for the first section
				if( dataPerSession[j].x <= sectionLineX[1] ){
					if(dataPerSession[j].eventCat=="Positive"){
						listPositive[0] = listPositive[0] + 1;
					}
					if(dataPerSession[j].eventCat=="Neutral"){
						listNeutral[0] = listNeutral[0] + 1;
					}
					if(dataPerSession[j].eventCat=="Negative"){
						listNegative[0] = listNegative[0] + 1;
					}
				}
				
				// for the last section
				if(dataPerSession[j].x > sectionLineX[sectionLineX.length-2]){
					if(dataPerSession[j].eventCat=="Positive"){
						listPositive[sectionLineX.length-2] = listPositive[sectionLineX.length-2] + 1;
					}
					if(dataPerSession[j].eventCat=="Neutral"){
						listNeutral[sectionLineX.length-2] = listNeutral[sectionLineX.length-2] + 1;
					}
					if(dataPerSession[j].eventCat=="Negative"){
						listNegative[sectionLineX.length-2] = listNegative[sectionLineX.length-2] + 1;
					}
				}

				
				// for the middle section
				else{
					for(var k=1; k<sectionLineX.length-2; k++){
						if((dataPerSession[j].x > sectionLineX[k]) && (dataPerSession[j].x <= sectionLineX[k+1])){
							if(dataPerSession[j].eventCat=="Positive"){
								listPositive[k] = listPositive[k] + 1;
							}
							if(dataPerSession[j].eventCat=="Neutral"){
								listNeutral[k] = listNeutral[k] + 1;
							}
							if(dataPerSession[j].eventCat=="Negative"){
								listNegative[k] = listNegative[k] + 1;
							}
						}
					}
				}
			}
		}
		
		for(var j= 1; j<=sliderValue; j++){
			window['dataArea'+j].push({sessionName:i+1,xArea:j,noOfEvent:listPositive[j-1],eventCat:"Positive"});
			window['dataArea'+j].push({sessionName:i+1,xArea:j,noOfEvent:listNeutral[j-1],eventCat:"Neutral"});
			window['dataArea'+j].push({sessionName:i+1,xArea:j,noOfEvent:listNegative[j-1],eventCat:"Negative"});
		}
		
	}
}

// Function to check if it's a Positive event
function isPositive(element) {
	return element.eventCat == "Positive";
}

// Function to check if it's a Negative event
function isNegative(element) {
	return element.eventCat == "Negative";
}

// Function to check if it's a Neutral event
function isNeutral(element) {
	return element.eventCat == "Neutral";
}