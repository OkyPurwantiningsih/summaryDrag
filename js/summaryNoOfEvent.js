var eventSliderVal, totalOfEvents, eventMinX, eventMaxX, 
	filteredData=[], dataPerSection=[], eventXLineList=[];

function drawNoOfEventGraph(){
	
	groupDataByNoOfEvent();
	defineStackFunction();
	defineAreaFunction();
	
	// ========================= Data Initialization =============================
	for(var i = 1; i <=(eventXLineList.length-1); i++){
		
		window['eventDataPosArea'+i] = window['eventDataArea'+i].filter(isPositive),
		window['eventDataNegArea'+i] = window['eventDataArea'+i].filter(isNegative);
		
		window['dataCombinedArea'+i] = [{type:eventType[0], dataArr: window['eventDataNegArea'+i], color:trColor[0]},
										{type:eventType[2], dataArr: window['eventDataPosArea'+i], color:trColor[2]}];
		//console.log(window['dataCombinedArea'+i]);
		
		window['stackData'+i] = stack(window['dataCombinedArea'+i]);
		//console.log(window['stackData'+i]);
	}
	
	initYAxis();
	initXAxis2();
	appendCanvas();
	
	// draw chart
	for(var i = 1; i <=(eventXLineList.length-1); i++){
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
		sectionWidth = (x(eventXLineList[i].x) - x(eventXLineList[i-1].x));

		svg.selectAll('.chart'+i).attr("transform", function(d){ return "translate("+ (x(eventXLineList[i-1].x)+ ((sectionWidth/2)-((tr_x(window['maxYAfterStacked'+i]))/2)) ) + "," + 0 + ")"; });
		//svg.selectAll('.chart'+i).attr("transform", function(d){ return "translate("+ x(eventXLineList[i-1].x) + "," + 0 + ")"; });
		
	}
	
	drawAxis();
	
	defineDragEventFunction();

	// Add a group element for each section.
	g = svg.selectAll(".section")
		  .data(eventXLineList)
		.enter().append("svg:g")
		  .attr("class", function(d) { return "section"+ d.linePos; })
		  .attr("transform", function(d) { return "translate(" + x(d.x) + ")"; })
		  .call(dragEvent);
	
	// Add section line and title.
	g.append("svg:g")
		  .attr("class", "axis")
		  .each(function(d) { d3.select(this).call(axis) })
		.append("svg:text")
		  .attr("text-anchor", "middle")
		  .attr("y", -9)
		  .text(function(d) {return d.text;});
}

function defineDragEventFunction(){
	dragEvent = d3.behavior.drag()
			.on("dragstart", function(d){
				
				// update value of linePos to correspond with the value of its class
				cls = this.getAttribute('class')
				d.linePos = parseInt(cls.substring(7,cls.length));
				
				crossedLeftLine.length = 0;
				crossedRightLine.length = 0;
				chartToUpdate.length = 0;
				chartToUpdate.push(d.linePos);
				chartToUpdate.push(d.linePos+1);
				lowerBound = null;
				upperBound = null;
							
			})
			.on("drag", function(d) {
				
				d.x = x2(d3.event.x);
				d.text = round(d.x,2);
				d3.select(this)
					.attr("transform", function(d) { return "translate(" + d3.event.x + ")"; })
					.selectAll("text").text(function(d){ return d.text;});
				
				
				recalculateSummaryEvent(d);
							
				
			})
			.on("dragend", function(d){
				// Update eventXLineList
				updatedSectionLine = [];
				updatedSectionLine.length = 0;

				if(crossedLeftLine.length > 0)
					crossedLeft = crossedLeftLine[crossedLeftLine.length-1].linePos;
				else
					crossedLeft = d.linePos;
				
				for(var i=0; i<crossedLeft; i++){
					updatedSectionLine.push(eventXLineList[i]);	
				}

				newd = {x:d.x, text:d.text, linePos:crossedLeft};
				updatedSectionLine.push(newd);
				// update section class
				d3.selectAll(".section"+d.linePos)
					.attr("class", "section"+crossedLeft);
				
				if(crossedRightLine.length > 0)
					crossedRight = crossedRightLine[crossedRightLine.length-1].linePos;
				else
					crossedRight = d.linePos;
				
				j=1;
				for(var i=crossedRight+1; i<eventXLineList.length; i++){
					// update section class
					d3.selectAll(".section"+eventXLineList[i].linePos)
						.attr("class", "section"+ (crossedLeft + j));
					eventXLineList[i].linePos = crossedLeft + j;
					updatedSectionLine.push(eventXLineList[i]);
					
					j++;
				}
				
				// Update chart
				sectionNo = chartToUpdate[0];
				for(var i=chartToUpdate[chartToUpdate.length-1]; i<eventXLineList.length; i++){

					d3.selectAll(".chart"+i)
						.attr("class", "chart"+(sectionNo+1));
						
					sectionNo++;
				}
				
				eventXLineList.length=0;
				eventXLineList = updatedSectionLine; 
	
				
			});
}

function recalculateSummaryEvent(line){
	// Check if current position of the dragged line cross the other line
	currentX = line.x;
	currentXPos = line.linePos;

	if(lowerBound === undefined || lowerBound === null){

		lowerBound = eventXLineList[line.linePos-1];
	}
	
	if(upperBound === undefined || upperBound === null){

		upperBound = eventXLineList[line.linePos+1];
	}

	if(currentX >= upperBound.x){
		// remove the line and add the removed line to the list
		if(d3.selectAll(".section"+upperBound.linePos).remove())
			crossedRightLine.push(eventXLineList[upperBound.linePos]);
		
		// remove chart 
		d3.selectAll(".chart"+upperBound.linePos).remove();
		
		// update upperBound
		upperBound = eventXLineList[upperBound.linePos+1];
		
		// get which chart to update
		if(chartToUpdate[chartToUpdate.length-1]!=upperBound.linePos)
			chartToUpdate.push(upperBound.linePos);
	}
	
	if(currentX <= lowerBound.x){
		// remove the line and add the removed line to the list
		if(d3.selectAll(".section"+lowerBound.linePos).remove())
			crossedLeftLine.push(eventXLineList[lowerBound.linePos]);
		
		// remove chart 
		d3.selectAll(".chart"+(lowerBound.linePos+1)).remove();

		// update upperBound
		lowerBound = eventXLineList[lowerBound.linePos-1];
		
		// get which chart to update
		if(chartToUpdate[0]!=(lowerBound.linePos+1))
			chartToUpdate.push(lowerBound.linePos+1);
	}
	
	chartToUpdate.sort(function compareString(a,b){
						if (parseInt(a)<parseInt(b))
							return -1;
						if (parseInt(a)>parseInt(b))
							return 1;
							
						return 0;
					});
	
	// Filter data 
	newData.length = 0;
	newData = filteredData.filter(function(d) { return ((d.x > lowerBound.x) && (d.x <= upperBound.x))}); 
	
	// Initialize variable to store data for each area
	for(var j= 1; j<=2; j++){
			window['newEventDataArea'+j] = [];
	}
	
	// Start grouping the data
	for(var j= 1; j<=2; j++){
		
		if(j==1){
			dataPerSection = newData.filter(function(d) { return ((d.x > lowerBound.x) && (d.x <= currentX));});
		}else{
			dataPerSection = newData.filter(function(d) { return ((d.x > currentX) && (d.x <= upperBound.x));});
		}
		
		
		countPos = 0, countNeg = 0;
		for(var i=0; i<listOfSession.length; i++){
			
			dataPerSession = dataPerSection.filter(function(d) { return d.sessionName == listOfSession[i];});
			
			countPos = dataPerSession.filter(isPositive).length;
			countNeg = dataPerSession.filter(isNegative).length;

			window['newEventDataArea'+j].push({sessionName:listOfSession[i],xArea:j,noOfEvent:countPos,eventCat:"Positive"});
			window['newEventDataArea'+j].push({sessionName:listOfSession[i],xArea:j,noOfEvent:countNeg,eventCat:"Negative"});
			
		}
	}
	
	for(var i = 1; i <=2; i++){
		
		window['newEventDataPosArea'+i] = window['newEventDataArea'+i].filter(isPositive),
		window['newEventDataNegArea'+i] = window['newEventDataArea'+i].filter(isNegative);
		
		window['newDataCombinedArea'+i] = [{type:eventType[0], dataArr: window['newEventDataNegArea'+i], color:trColor[0]},
										{type:eventType[2], dataArr: window['newEventDataPosArea'+i], color:trColor[2]}];
		
		window['newStackDataEvent'+i] = stack(window['newDataCombinedArea'+i]);
		
	}
	
	move.length = 0;
	move.push({lower: x(lowerBound.x), w: (x(currentX)-x(lowerBound.x)), max: getMaxY2(window['newStackDataEvent'+1])});
	move.push({lower: x(currentX), w: (x(upperBound.x)-x(currentX)), max: getMaxY2(window['newStackDataEvent'+2])});

	
	var j=1;
	//for(var i = line.linePos; i <=(line.linePos+1); i++){
	for(var i=chartToUpdate[0]; i<=chartToUpdate[chartToUpdate.length-1]; i++){	
		
		// Redraw Theme River	
		if( (i==chartToUpdate[0]) || (i==chartToUpdate[chartToUpdate.length-1])){
			//console.log(window['newStackDataEvent'+j]);
			svg.selectAll('.chart'+i)
				  .selectAll("path")
				  .data(window['newStackDataEvent'+j])
				  .attr("d", function(d) { return area(d.dataArr); })
				  .style("fill", function(d) { return d.color; });
			
			//window['newMaxY'+j] = getMaxY2(window['newStackDataEvent'+j]);
			svg.selectAll('.chart'+i)
			.attr("transform", function(d){ return "translate("+ (move[j-1].lower + ((move[j-1].w/2)-(tr_x(move[j-1].max)/2))) + "," + 0 + ")"; })
			.transition()
			.duration(2500);
			//svg.selectAll('.chart'+i).attr("transform", function(d){ return "translate("+ move[j-1].lower + "," + 0 + ")"; });

			
			j++;
		}
		
	}
}

function initXAxis2(){

	// Set X axis for the chart
	x = d3.scale.linear().range([0, width]),
	//eventMaxX = filteredData[filteredData.length-1].x,
	//x.domain([eventMinX, eventMaxX]);
	minX = d3.min(filteredData, function(d) {return parseFloat(d.x);}),
	maxX = d3.max(filteredData, function(d) {return parseFloat(d.x);}),
	x.domain([minX, maxX]);

	// Set scale to get x value from dragging position
	x2 = d3.scale.linear().range([minX,maxX]).domain([0,width]);
	
	// Set scale for each theme river graph
	// Get minimum and maximum x value for all area
	// Final x value is calculated from initial y and y0 value since the chart is vertical
	
	trminX = getMinY(eventXLineList.length-1),
	trmaxX = getMaxY(eventXLineList.length-1);
	
	tr_x = d3.scale.linear()
				.range([0, getMinSectionSize()])
				.domain([trminX-1, trmaxX+1]);
	
	xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.ticks(0);

}

function getMinSectionSize(){
	var minSize = x(eventXLineList[1].x) - x(eventXLineList[0].x);
	for(var i=1;i<(eventXLineList.length-1); i++){
		if( minSize > (x(eventXLineList[i+1].x) - x(eventXLineList[i].x)) )
			minSize = x(eventXLineList[i+1].x) - x(eventXLineList[i].x);
	}
	
	return minSize;
}

function groupDataByNoOfEvent(){
	
	
	
	// Order the data by the value of x, ascending
	filteredData.sort(function compareX(a,b){
				if (parseInt(a.x)<parseInt(b.x))
					return -1;
				if (parseInt(a.x)>parseInt(b.x))
					return 1;
					
				return 0;
			});
	
	// Add the very left line to the list
	eventXLineList.length = 0;
	eventMinX = filteredData[0].x;
	eventXLineList.push({x:eventMinX, text:round(eventMinX,2), linePos: 0});
	
	
	var i = 0, areaNo = 1, eventLeft = filteredData.length;
	while(i<filteredData.length){
		
		// For every eventSliderVal value, group the data by event type
		endSlice = i + eventSliderVal;
		eventLeft = filteredData.length - endSlice;
		if(eventLeft < 10){
			dataPerSection = filteredData.slice(i);
			endSlice = filteredData.length;
		}else{
			dataPerSection = filteredData.slice(i, endSlice);
		}
		
		// Add the section line to the list
		eventLine = d3.max(dataPerSection, function(d) {return parseFloat(d.x);});
		eventXLineList.push({x:eventLine, text:round(eventLine,2), linePos: areaNo});
		
		window['eventDataArea'+areaNo] = [];
		countPos = 0, countNeg = 0;
		for(var j=0; j<listOfSession.length; j++){
			dataPerSession = dataPerSection.filter(function(d) { return d.sessionName == listOfSession[j];});
			countPos = dataPerSession.filter(isPositive).length;
			countNeg = dataPerSession.filter(isNegative).length;
			
			window['eventDataArea'+areaNo].push({sessionName:listOfSession[j],xArea:areaNo,noOfEvent:countPos,eventCat:"Positive"});
			window['eventDataArea'+areaNo].push({sessionName:listOfSession[j],xArea:areaNo,noOfEvent:countNeg,eventCat:"Negative"});
		}
		
		//console.log(window['eventDataArea'+areaNo]);
		i=endSlice;
		areaNo++;
	}
		
}

// Function to check if it's a Positive or negative event
function isPositiveOrNegative(element) {
	return ((element.eventCat == "Positive")||(element.eventCat == "Negative"));
}

