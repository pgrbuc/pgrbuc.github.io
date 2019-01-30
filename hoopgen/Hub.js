//Hub Object "class"
var Hub = function(
    lFlangeDiameter,
    rFlangeDiameter,
    lFlangeToCenter,
    rFlangeToCenter,
    flangeWidth
    ){

// Left Flange /////////////////////////////////////////////////////////////////
this.getLeftHubGeom = function(hubSegments){
    var rFlangeRadius = (rFlangeDiameter/2.0) + 5;
    var rFlangeInPosition = rFlangeToCenter - (flangeWidth/2.0);
    var rFlangeOutPosition = rFlangeInPosition + (flangeWidth);
    var lFlangeRadius = (lFlangeDiameter/2.0) + 5;
    var lFlangeInPosition = -lFlangeToCenter + (flangeWidth/2.0);
    var lFlangeOutPosition = lFlangeInPosition - (flangeWidth);
    var bearingRadius = lFlangeRadius/1.4;
    var bearingWidth = 10;


    var leftPoints = [];
    leftPoints.push(new THREE.Vector2( 0, lFlangeOutPosition - bearingWidth ));
    leftPoints.push(new THREE.Vector2( 10, lFlangeOutPosition - bearingWidth ));
    leftPoints.push(new THREE.Vector2( bearingRadius, lFlangeOutPosition ));
    leftPoints.push(new THREE.Vector2( lFlangeRadius, lFlangeOutPosition ));
    leftPoints.push(new THREE.Vector2( lFlangeRadius, lFlangeInPosition ));
    leftPoints.push(new THREE.Vector2( 0, lFlangeInPosition ));
    return new THREE.LatheGeometry( leftPoints, hubSegments );
}

// Center Hub //////////////////////////////////////////////////////////////////
this.getCentHubGeom = function(hubSegments){
    var rFlangeRadius = (rFlangeDiameter/2.0) + 5;
    var rFlangeInPosition = rFlangeToCenter - (flangeWidth/2.0);
    var rFlangeOutPosition = rFlangeInPosition + (flangeWidth);
    var lFlangeRadius = (lFlangeDiameter/2.0) + 5;
    var lFlangeInPosition = -lFlangeToCenter + (flangeWidth/2.0);
    var lFlangeOutPosition = lFlangeInPosition - (flangeWidth);
    var lBearingRadius = lFlangeRadius/1.4;
    var rBearingRadius = rFlangeRadius/1.4;
    var bearingWidth = 10;


    var shellRadius = (rFlangeDiameter+lFlangeDiameter)/7;

    shellRadius = (rFlangeDiameter+lFlangeDiameter)/7;

    if (shellRadius > rFlangeDiameter/3)
        {shellRadius = rFlangeDiameter/3;}
    if (shellRadius > lFlangeDiameter/3)
        {shellRadius = lFlangeDiameter/3;}
    if (shellRadius > WHEEL.rimDiameter/2 -10)
        {shellRadius = WHEEL.rimDiameter/2 -10;}


    var centerPoints = [];
    var spacersAndLocknuts = 18;
    var leftAxleEnd = lFlangeToCenter + flangeWidth + spacersAndLocknuts;
    var rightAxleEnd = rFlangeToCenter + flangeWidth + spacersAndLocknuts;

    var axleRadius = 5;

    centerPoints.push(new THREE.Vector2( 0, -leftAxleEnd));
    centerPoints.push(new THREE.Vector2( axleRadius, -leftAxleEnd));
    centerPoints.push(new THREE.Vector2( axleRadius, -lFlangeToCenter));
    centerPoints.push(new THREE.Vector2( lBearingRadius-1, -lFlangeToCenter));
    centerPoints.push(new THREE.Vector2( shellRadius, lFlangeInPosition+bearingWidth));
    centerPoints.push(new THREE.Vector2( shellRadius, rFlangeInPosition-bearingWidth));
    centerPoints.push(new THREE.Vector2( rBearingRadius-1, rFlangeToCenter-1));
    centerPoints.push(new THREE.Vector2( axleRadius, rFlangeToCenter-1));
    centerPoints.push(new THREE.Vector2( axleRadius, rightAxleEnd ));
    centerPoints.push(new THREE.Vector2( 0, rightAxleEnd ));
    return new THREE.LatheGeometry( centerPoints, hubSegments );
}

// Right Flange ////////////////////////////////////////////////////////////////
this.getRightHubGeom = function(hubSegments){
    var rFlangeRadius = (rFlangeDiameter/2.0) + 5;
    var rFlangeInPosition = rFlangeToCenter - (flangeWidth/2.0);
    var rFlangeOutPosition = rFlangeInPosition + (flangeWidth);
    var lFlangeRadius = (lFlangeDiameter/2.0) + 5;
    var lFlangeInPosition = -lFlangeToCenter + (flangeWidth/2.0);
    var lFlangeOutPosition = lFlangeInPosition - (flangeWidth);
    var bearingRadius = rFlangeRadius/1.4;
    var bearingWidth = 10;

    var rightPoints = [];
    rightPoints.push(new THREE.Vector2( 0, rFlangeInPosition ));
    rightPoints.push(new THREE.Vector2( rFlangeRadius, rFlangeInPosition ));
    rightPoints.push(new THREE.Vector2( rFlangeRadius, rFlangeOutPosition ));
    rightPoints.push(new THREE.Vector2( bearingRadius, rFlangeOutPosition));
    rightPoints.push(new THREE.Vector2( 10, rFlangeOutPosition + bearingWidth));
    rightPoints.push(new THREE.Vector2( 0, rFlangeOutPosition + bearingWidth ));
    return new THREE.LatheGeometry( rightPoints, hubSegments );
}

// Make Mesh ///////////////////////////////////////////////////////////////////
this.makeHubMesh = function(){
    var hubSegments = getSeg(8, 40);

    var hubMesh = new THREE.Mesh();

    hubMesh.add( new THREE.Mesh( this.getRightHubGeom(hubSegments), mdkred) );
    hubMesh.add( new THREE.Mesh( this.getLeftHubGeom(hubSegments), mdkblue) );
    hubMesh.add( new THREE.Mesh( this.getCentHubGeom(hubSegments), mdkyellow));

    //final rotation
    hubMesh.rotation.x = 90 * toRad;
    return hubMesh;
}

this.mesh = this.makeHubMesh();

this.needsUpdate = false;

}//End of Class
