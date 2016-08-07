//**************************************************************
//Code for function loadFile() is taken from stackoverflow.com to read the file
//**************************************************************
 function loadFile() {
    var input, file, fr;

    if (typeof window.FileReader !== 'function') {
      alert("The file API isn't supported on this browser yet.");
      return;
    }

    input = document.getElementById('fileinput');
    if (!input) {
      alert("Um, couldn't find the fileinput element.");
    }
    else if (!input.files) {
      alert("This browser doesn't seem to support the `files` property of file inputs.");
    }
    else if (!input.files[0]) {
      alert("Please select a file before clicking 'Load'");
    }
    else {
      file = input.files[0];
      fr = new FileReader();
      fr.onload = receivedText;
      fr.readAsText(file);
    }

    function receivedText(e) {
      lines = e.target.result;
	  $('#jsonInputText').val( e.target.result);
    }
  }


(function calculateCutoutCost() {

	//**************************************************************
	//Given values
	//- Padding: 0.1in
	//- Material Cost: $0.75/in^2
	//- Maximal laser cutter speed: 0.5 in/s
	//- Machine Time Cost: $0.07/s
	//**************************************************************

	//In order to have 0.1 inch padding, we need to add 0.05 inches padding to each side
    var Padding = 0.05; 
    var MaterialCost = 0.75; 
    var v_max = 0.5; 
    var MachineTimeCost = 0.07; 
	var inputdata;
    var estimateCostButton;
	    
	//  Output variables
    var displayRectanglesizeOutput;
    var materialCostOut;
    var cutCostOut;
    var totalCostOut;

    var ec = window.estimateQuote = window.estimateQuote || {};

    $("document").ready(function() {		
        inputdata = $('#jsonInputText');
        estimateCostButton = $('#calcCost');
        displayRectanglesizeOutput = $('#rectanguleDimension');
        materialCostOut = $('#materialCost');
        cutCostOut = $('#cutCost');
        totalCostOut = $('#totalCost');
		
		if(inputdata.val().Length == 0)
		{
			alert("empty")
		}
        estimateCostButton.click(function() {
            ec.estimatecost();
        });		
    });

    ec.estimatecost = function() {

		//Reading JSON input from textarea
        var jsonTextInput = inputdata.val();
        var json = JSON.parse(jsonTextInput);

        var arcs = [];
		var lines = [];
		var points = [];
		
        var arcSearchtable = {};     
        var lineSearchtable = {};        
        var pointSearchtable = {};

		//Check if edge is not set to null
        json.Edges = json.Edges || {};
        var vertices = json.Vertices || {};

        for (id in vertices) {       
            if (vertices.hasOwnProperty(id)) {
                var vertex = vertices[id];
                var point = {
                    x: vertex.Position.X,
                    y: vertex.Position.Y
                };
				//	insert point into an array and also into search table
                points.push(point);
                pointSearchtable[id] = point;
            }
        }

        for (id in json.Edges) {
            if (json.Edges.hasOwnProperty(id)) {
                var edge = json.Edges[id];
                if (edge.Type === "CircularArc") {
                    var center = {
                        x: edge.Center.X,
                        y: edge.Center.Y
                    };
                    startId = edge.ClockwiseFrom;
                    endid = edge.ClockwiseFrom == edge.Vertices[0] ? edge.Vertices[1] : edge.Vertices[0]
                    var start = pointSearchtable[startId];
                    var end = pointSearchtable[endid];
                    var radius = findRadiusforCircularArc(edge, pointSearchtable);

                    var arc = {
                        center: center,
                        start: start,
                        end: end,
                        radius: radius
                    };
                    arcs.push(arc);
                    arcSearchtable[id] = arc;
                } else if (edge.Type === "LineSegment") {
                    var point1 = pointSearchtable[edge.Vertices[0]];
                    var point2 = pointSearchtable[edge.Vertices[1]];
                    var line = {
                        p1: point1,
                        p2: point2
                    };
                    line.length = findLineSegmentLength(line);
                    lines.push(line);
                    lineSearchtable[id] = line;
                }
            }
        }

        //	for each circular arc, add points along the arc which forms the hull
        for (var i = 0; i < arcs.length; i++) {
            addPointsAlongtheArc(arcs[i], points);
        }

        //	Find bounding rectangle with minimum area
        boundingRectangle = getboundingRectangle(points);

        //	add specified padding
        boundingRectangle.xMin -= Padding;
        boundingRectangle.xMax += Padding;
        boundingRectangle.yMin -= Padding;
        boundingRectangle.yMax += Padding;
        areaAlongwithPadding = findAreaOfRectangle(boundingRectangle);

        var laserCuttingTime = 0;
        for (var i = 0; i < lines.length; i++) {
            laserCuttingTime += lines[i].length / v_max;
        }
        for (var i = 0; i < arcs.length; i++) {
            arcCutTime = findCuttingTimeForArc(arc);
            laserCuttingTime += arcCutTime;
        }

        //  Set rectangle size
        rectangleSize(boundingRectangle);
		
        //  output material cost to window
        var materialCost = areaAlongwithPadding * MaterialCost;		
        //  set material cost
        materialCostOut.val(materialCost.toFixed(2));

		//Calculate the total cutting time
        var cutCost = laserCuttingTime * MachineTimeCost;
		//set the total material cutting time
        cutCostOut.val(cutCost.toFixed(2));

        //	Output Total cost
        var totalCost = cutCost + materialCost;
		//set the total cost for cutting
        totalCostOut.val(totalCost.toFixed(2));
    };
	
	
	function findRadiusforCircularArc(arc, pointSearchtable) {
        var centerPoint = arc.Center;
        //	find the id of the end point
        var endPointId = arc.ClockwiseFrom === arc.Vertices[0] ? arc.Vertices[1] : arc.Vertices[0];

        var startPoint = pointSearchtable[arc.ClockwiseFrom];
        var endPoint = pointSearchtable[endPointId];

        var deltaX = startPoint.x - centerPoint.X;
        var deltaY = startPoint.y - centerPoint.Y;
        var radius = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
        return radius;
    }
	
    function findLineSegmentLength(line) {
        var p1 = line.p1;
        var p2 = line.p2;
        var deltaX = p1.x - p2.x;
        var deltaY = p1.y - p2.y;
        var length = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
        return length;
    }

    function rectangleSize(rect) {
        // calculate area
        var width = rect.xMax - rect.xMin;
        var height = rect.yMax - rect.yMin;
        var area = height * width;
		
        //set output
        displayRectanglesizeOutput.val(area.toFixed(2));
    }

    function findCuttingTimeForArc(arc) {
		
        //  since laser cutting speed is given by v_max * exp(-1/R) where v_max is maximal laser cutting speed
		arcCuttingSpeed = v_max * Math.exp(-1 / arc.radius);
        startingAngle = arc.startingAngle;
        endingAngle = arc.endingAngle;
		
        //There can be a case where atan2 goes from -pi to pi. 
		//To consider that case below code checks if ending angle 
		//is greater than starting angle and increment starting angle by 2 pi
		
        if (endingAngle > startingAngle) {
            startingAngle += 2 * Math.PI;
        }
        //Length of an arc is given as radius times angular distance of arc (0-2*pi)
        lengthofArc = arc.radius * (startingAngle - endingAngle);
		//to find cutting time divide length by laser cutting speed
        return lengthofArc / arcCuttingSpeed;
    }

    function addPointsAlongtheArc(arc, points) {
		
        //	set 100 points along the arc having radius r
        var arcRadius = arc.radius / Math.cos(Math.PI / 100);
		
        //	calculate angles from center to start and end points
        var deltaX = arc.start.x - arc.center.x;
        var deltaY = arc.start.y - arc.center.y;
        var startingAngle = Math.atan2(deltaX, deltaY);
        arc.startingAngle = startingAngle;
        var deltaX = arc.end.x - arc.center.x;
        var deltaY = arc.end.y - arc.center.y;
        var endingAngle = Math.atan2(deltaX, deltaY);
        arc.endingAngle = endingAngle;

        //There can be a case where angle goes from -pi to pi. 
		//To consider the case below code checks if ending angle is  
		//greater than starting angle and increment starting angle by 2 pi		
        if (endingAngle > startingAngle) {
            startingAngle += 2 * Math.PI;
        }

        var theta = startingAngle;
		
        while (theta > endingAngle) {
			
            //	adjustment needed if correction is to be taken into consideration for the case when angles goes from -pi to pi
            var normalAngle = theta > Math.PI ? theta - (2 * Math.PI) : theta;
			
            //	calculate point along the arc location 
            deltaX = arcRadius * Math.sin(normalAngle);
            deltaY = arcRadius * Math.cos(normalAngle);
            arcPntX = arc.center.x - deltaX;
            arcPntY = arc.center.y + deltaY;

            //  add point along arc to the list of points that will construct the surface of the cutout part
            var pointsAlongArc = {
                x: arcPntX,
                y: arcPntY,
                id: 'pointsAlongArc'
            };
            points.push(pointsAlongArc);

            theta -= (Math.PI / 50);
        }
    }

    function getboundingRectangle(points) {
        var xMin = Number.MAX_VALUE;
        var xMax = Number.MIN_VALUE;
        var yMin = Number.MAX_VALUE;
        var yMax = Number.MIN_VALUE;

        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            xMin = Math.min(xMin, point.x);
            xMax = Math.max(xMax, point.x);
            yMin = Math.min(yMin, point.y);
            yMax = Math.max(yMax, point.y);
        }
        var rectangle = {
            xMin: xMin,
            xMax: xMax,
            yMin: yMin,
            yMax: yMax
        };
        return rectangle;
    }

    function findAreaOfRectangle(rectangle) {
        return (rectangle.xMax - rectangle.xMin) * (rectangle.yMax - rectangle.yMin);
    }
})();