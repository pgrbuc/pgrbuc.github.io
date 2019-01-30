var Rim = function (rimDiameter,rimWidth,rimDepth,rimHoleOffset,rimRightHanded)
{
    // Left Sidewall ///////////////////////////////////////////////////////////
    this.getLeftRimGeom = function(xin, xout, sidewallWidth, rimSegments){
        var leftPts = new Array(5);
        leftPts[0] = new THREE.Vector2( xin, -rimWidth/2.00 );
        leftPts[1] = new THREE.Vector2( xout, -rimWidth/2.00 );
        leftPts[2] = new THREE.Vector2( xout, -rimWidth/2.00 + sidewallWidth );
        leftPts[3] = new THREE.Vector2( xin, -rimWidth/2.00 + sidewallWidth );
        leftPts[4] = new THREE.Vector2( xin, -rimWidth/2.00 );
        leftGeo = new THREE.LatheGeometry( leftPts, rimSegments );
        leftGeo.rotateX(90.0 * toRad);
        return leftGeo;
    }

    // Right Sidewall///////////////////////////////////////////////////////////
    this.getRightRimGeom = function(xin, xout, sidewallWidth, rimSegments){
        var rightPts = new Array(5);
        rightPts[0] = new THREE.Vector2( xin, rimWidth/2.00 );
        rightPts[1] = new THREE.Vector2( xin, rimWidth/2.00 - sidewallWidth);
        rightPts[2] = new THREE.Vector2( xout, rimWidth/2.00 - sidewallWidth);
        rightPts[3] = new THREE.Vector2( xout, rimWidth/2.00 );
        rightPts[4] = new THREE.Vector2( xin, rimWidth/2.00 );
        rightGeo = new THREE.LatheGeometry( rightPts, rimSegments );
        rightGeo.rotateX(90.0 * toRad);
        return rightGeo;
    }

    // Center Of Rim ///////////////////////////////////////////////////////////
    this.getCenterRimGeom = function(xin, xout, rimSegments){
        //center of rim
        var centerPoints = [];
        centerPoints.push( new THREE.Vector2( xin, -rimWidth/2.00 ));
        centerPoints.push( new THREE.Vector2( xin, rimWidth/2.00 ));
        centerPoints.push( new THREE.Vector2( xin - 5, 0 ));
        centerPoints.push( new THREE.Vector2( xin, -rimWidth/2.00 ));
        centerGeo = new THREE.LatheGeometry( centerPoints, rimSegments );
        centerGeo.rotateX(90.0 * toRad);
        return centerGeo;
    }

    // Valve Hole //////////////////////////////////////////////////////////////
    this.getValveHoleGeom = function(){
        var valveHoleRadius = 5;
        var valveHoleWidth = 12;

        var valveSegments = getSeg(5, 32);

        //position of valve hole
        var x = rimDiameter/2.0;
        var y = 0;

        var valveGeometry = new THREE.CylinderGeometry(
            valveHoleRadius,
            valveHoleRadius,
            valveHoleWidth,
            valveSegments
        );

        //rotate and place
        valveGeometry.rotateZ(90.0 * toRad);
        valveGeometry.translate(x,y,0);
        valveGeometry.rotateY(90.0 * toRad);
        valveGeometry.rotateX(90.0 * toRad);
        return valveGeometry;
    }

    this.makeRimMesh = function(){
        //percent to offset the top of the sidewall from the bottom of sidewall
        var rimRatio = rimDepth/rimDiameter + 1;

        //inside outside diameter
        var xin = rimDiameter/2;
        var xout = xin * rimRatio;
        var sidewallWidth = 2;

       //polygon fidelity
        var rimSegments = getSeg(32, 180);

        var rimMesh = new THREE.Mesh();

        var rightGeometry = this.getRightRimGeom(
            xin,
            xout,
            sidewallWidth,
            rimSegments);
        rimMesh.add(new THREE.Mesh( rightGeometry, mdkred ));

        var leftGeometry = this.getLeftRimGeom(
            xin,
            xout,
            sidewallWidth,
            rimSegments);
        rimMesh.add(new THREE.Mesh( leftGeometry, mdkblue ));

        var centerGeometry = this.getCenterRimGeom(xin, xout, rimSegments);
        rimMesh.add(new THREE.Mesh( centerGeometry, mltgrey ));

        //adds valve hole to mesh
        rimMesh.add(new THREE.Mesh(this.getValveHoleGeom(), mdkyellow));

        return rimMesh;
    }

    this.mesh = this.makeRimMesh();

    this.needsUpdate = false;
}
