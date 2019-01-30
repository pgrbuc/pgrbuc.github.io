var Wheel = function(){
    // Rim Vars ////////////////////////////////////////////////////////////////

    this.rimDiameter = 600;         //diameter of inside of rim in mm (IRD)
    this.rimWidth = 20;             //width of rim in mm
    this.rimDepth = 15;             //depth of rim in mm
    this.rimHoleOffset = 2;         //offset from the rim center to spoke holes
    this.rimRightHanded = true;     //rim holes drilled right of left "handed"
    this.rimObj;                    //rim object with [mesh] and [needsUpdate]

    // Hub Vars ////////////////////////////////////////////////////////////////

    this.lFlangeDiameter = 60;   //spoke hole diameter
    this.rFlangeDiameter = 60;   //spoke hole diameters
    this.lFlangeToCenter = 40;   //center of hub to center of flange
    this.rFlangeToCenter = 40;   //center of hub to center of flange
    this.flangeWidth = 2.0;      //width of flange hub
    this.hubObj;                 //hub object with [mesh] and [needsUpdate]

    // Spoke Vars //////////////////////////////////////////////////////////////

    this.spokeNumber = 36;               //number of spokes
    this.spokeCrossings = 3;             //lacing cross pattern
    this.rightLeadingSpokesIn = true;
    this.leftLeadingSpokesIn = true;
    this.manualSpoke = false;
    this.spokeWidth = 2.1;               //diameter of spoke
    this.spokesObj;

    // Misc Vars ///////////////////////////////////////////////////////////////

    this.segmentSize = 5;                //polygon fidelity
    this.instructionUpdate = function(){}

    // Build //////////////////////////////////////////////////////////////////

    this.newRim = function(){
        if (this.rimObj !== undefined)
            cleanMesh(this.rimObj.mesh);

        this.rimObj = new Rim(
            this.rimDiameter,
            this.rimWidth,
            this.rimDepth,
            this.rimHoleOffset,
            this.rimRightHanded
        );
        scene.add(this.rimObj.mesh);
    }

    this.newHub = function(){
        if (this.hubObj !== undefined)
            cleanMesh(this.hubObj.mesh);

        this.hubObj = new Hub(
            this.lFlangeDiameter,
            this.rFlangeDiameter,
            this.lFlangeToCenter,
            this.rFlangeToCenter,
            this.flangeWidth
        );
        scene.add(this.hubObj.mesh);
    }

    this.newSpokes = function(){
        if (this.spokesObj !== undefined)
            cleanMesh(this.spokesObj.mesh);

        this.spokesObj = new Spokes();

       scene.add(this.spokesObj.mesh);
    }

    this.update = function(){
        if ( (this.rimObj == undefined) || (this.rimObj.needsUpdate) )
            this.newRim();

        if ( (this.hubObj == undefined) || (this.hubObj.needsUpdate) )
            this.newHub();

        if ( (this.spokesObj == undefined) || (this.spokesObj.needsUpdate) )
            this.newSpokes();

        this.instructionUpdate();
    }
}


var toRad = Math.PI/180.00;         //used to convert degrees to rads

function getSeg(min, max)
{
    var step = Math.round((max - min)/10)
    return min + step*(WHEEL.segmentSize-1);
}

// Random Methods???
function rSpokeCalc()
{
    var rFlangeRadius = WHEEL.rFlangeDiameter/2;
    var rimRadius = WHEEL.rimDiameter/2;
    var spokeHoleDiameter = 2.4;

    //e is the first first length of a rectangular prism
    //the radius of the flange * the length of the leg of a triangle that is from
    // the sine of the angle between two spokes on the same side of the wheel

    var spokeDegree = ( 360 / WHEEL.spokeNumber ) * ( WHEEL.spokeCrossings * 2 );

    var e =  rFlangeRadius * Math.sin( spokeDegree * toRad );

    //f is the second length of a rectangular prism
    //rim Radius minus the leg of a triangle that is from the cosine of the same angle
    var f = rimRadius - ( rFlangeRadius * Math.cos( spokeDegree * toRad ));

    //g is the last length of the rectangular prism
    //it's just the the distance between the flange to the center of the hub
    var g = WHEEL.rFlangeToCenter;

    return Math.sqrt( Math.pow(e,2) + Math.pow(f,2) + Math.pow(g,2)) - (spokeHoleDiameter / 2.0) ;
}

function lSpokeCalc()
{
    var lFlangeRadius = WHEEL.lFlangeDiameter/2;
    var rimRadius = WHEEL.rimDiameter/2;
    var spokeHoleDiameter = 2.4;

    //e is the first first length of a rectangular prism
    //the radius of the flange * the length of the leg of a triangle that is from
    // the sine of the angle between two spokes on the same side of the wheel


    var spokeDegree = ( 360 / WHEEL.spokeNumber ) * ( WHEEL.spokeCrossings * 2 );

    var e =  lFlangeRadius * Math.sin( spokeDegree * toRad );

    //f is the second length of a rectangular prism
    //rim Radius minus the leg of a triangle that is from the cosine of the same angle
    var f = rimRadius - ( lFlangeRadius * Math.cos( spokeDegree * toRad ));

    //g is the last length of the rectangular prism
    //it's just the the distance between the flange to the center of the hub
    var g = WHEEL.lFlangeToCenter;

    return Math.sqrt( Math.pow(e,2) + Math.pow(f,2) + Math.pow(g,2)) - (spokeHoleDiameter / 2.0) ;
}

