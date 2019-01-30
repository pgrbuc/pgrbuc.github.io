// Spoke ///////////////////////////////////////////////////////////////////////
var Spoke = function(nipPoint, hubPoint, rightSpoke, facingOut, leads){

    this.getPointInBetweenByPerc = function(pointA, pointB, percentage) {
        var dir = pointB.clone().sub(pointA);
        var len = dir.length();
        dir = dir.normalize().multiplyScalar(len*percentage);
        return pointA.clone().add(dir);
    }

    this.getSpokeGeom = function(nipPt, hubPt, rightSpoke, facingOut){
        var pt0, pt2, pt3;

        //I should actually calculate the percent based on
        //number of crossings + length + number of spokes
        pt0 = hubPt;
        pt0.z = (rightSpoke ? WHEEL.rFlangeToCenter : -WHEEL.lFlangeToCenter)
        pt2 = this.getPointInBetweenByPerc(hubPt, nipPt, .02);
        pt3 = this.getPointInBetweenByPerc(hubPt, nipPt, .50);
        var firstBend;
        var firstBend = (rightSpoke ? WHEEL.rFlangeToCenter : WHEEL.lFlangeToCenter);
        var secondBend = 3;

        if (facingOut){
            //under two over one
            //stays in then bends out
            pt2.z = (firstBend * Math.sign(pt2.z)) + (WHEEL.flangeWidth * -Math.sign(pt2.z));
            if (WHEEL.spokeCrossings>0)
                pt3.z += secondBend * Math.sign(pt3.z);
        }
        else if (!facingOut){
            //over two under one
            //bends out then ducks down.
            pt2.z = firstBend * Math.sign(pt2.z) + (WHEEL.flangeWidth * Math.sign(pt2.z));
            if (WHEEL.spokeCrossings>0)
                pt3.z -= secondBend * Math.sign(pt3.z);
        }

        var path = new THREE.CatmullRomCurve3([pt0, /*hubPt,*/  pt2, pt3,  nipPt]);

        var spokeGeometry = new THREE.TubeGeometry(
            path,               //path
            getSeg(10, 105),    //number of polygon segments for the curve
            WHEEL.spokeWidth/2.0,     //radius
            getSeg(3, 15)       //number of segments for the spoke cylinder
        );

        return spokeGeometry;
    };

    this.getHeadGeom = function( hubPt, rightSpoke, facingOut){

        var leftIn  = !rightSpoke && !facingOut;
        var leftOut = !rightSpoke && facingOut;
        var rightIn = rightSpoke  && !facingOut;
        var rightOut = rightSpoke && facingOut;

        var flangeToCenter = rightSpoke ? WHEEL.rFlangeToCenter : -WHEEL.lFlangeToCenter;

        var headWidth = 1.5;

        var headOffset = (headWidth/2.0) + (WHEEL.flangeWidth/2.0);

        var headPos, hRotation;

        if ( leftIn || rightOut ){
            headPos = flangeToCenter + headOffset;
            hRotation = 90 * toRad;
        }
        else if ( leftOut || rightIn ){
            headPos = flangeToCenter - headOffset;
            hRotation = 270 * toRad;
        }

        var headGeom = new THREE.CylinderGeometry(
            2/1.8,              //radiusTop
            2,                  //radiusBottom
            headWidth,          //Width
            getSeg(4, 14));     //number of polygon segments

        headGeom.rotateX(hRotation);
        headGeom.translate(hubPt.x, hubPt.y, headPos);

        return headGeom;
    };

    this.getNippleGeom = function(nipPt, hubPt){
        var nippleRadius = 2;

        var pt1 = this.getPointInBetweenByPerc(hubPt, nipPt, .965);
        var pt2 = this.getPointInBetweenByPerc(hubPt, nipPt, 1.01);

        var direction = new THREE.Vector3().subVectors(pt2, pt1);

        var orientation = new THREE.Matrix4();

        orientation.lookAt(pt1, pt2, new THREE.Object3D().up);

        orientation.multiply(new THREE.Matrix4().set(
            1, 0, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 0,
            0, 0, 0, 1)
        );

        var nippleGeom = new THREE.CylinderGeometry(
            nippleRadius,           //radiusTop
            nippleRadius,           //radiusBot
            direction.length(),     //height
            getSeg(4,15)            //radiusSegments
        );

        nippleGeom.applyMatrix(orientation);

        var ptx = (pt2.x + pt1.x) / 2;
        var pty = (pt2.y + pt1.y) / 2;
        var ptz = (pt2.z + pt1.z) / 2;

        nippleGeom.translate(ptx, pty, ptz);

        return nippleGeom;
    };

    this.mergeGeometry = function(spokeGeom, headGeom, nippleGeom){
        var returnGeom = new THREE.Geometry();

        returnGeom.merge(spokeGeom);
        returnGeom.merge(headGeom);
        returnGeom.merge(nippleGeom);

        return returnGeom;
    };

    this.geometry = this.mergeGeometry(
        this.getSpokeGeom(nipPoint, hubPoint, rightSpoke, facingOut),
        this.getHeadGeom(hubPoint, rightSpoke, facingOut),
        this.getNippleGeom(nipPoint, hubPoint)
    );

    if (rightSpoke && leads)
        this.material = msred;
    else if (rightSpoke && !leads)
        this.material = msdkred;
    else if (!rightSpoke && leads)
        this.material = msblue;
    else
        this.material = msdkblue;

    //this.material = rightSpoke ? mdkred : mdkblue;

    this.mesh = new THREE.Mesh(this.geometry, minvis);
}

