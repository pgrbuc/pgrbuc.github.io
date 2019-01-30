var Spokes = function(){
    this.mesh = new THREE.Mesh();
    this.spokeArray = [];
    this.spokeQueue = [];
    this.needsQueue = true;
    this.needsUpdate = false;

    this.addSpoke = function() {
        var i = 1;
        var i = this.spokeQueue.pop();
        if (i == undefined)
            return;
        var spokeNumber = WHEEL.spokeNumber;
        var loopAngle = 90 - (360 / spokeNumber * i) - ((360/spokeNumber)/2);
        var rightSpoke;
        var facingOut;
        var leads;
        var spokeType = i % 4;

        switch (spokeType){
            case 0: rightSpoke = false; facingOut = false; leads = false; break;
            case 1: rightSpoke = true;  facingOut = false; leads = false; break;
            case 2: rightSpoke = false; facingOut = true; leads = true; break;
            case 3: rightSpoke = true;  facingOut = true; leads = true; break;
        }

        //flips rim drilling
        if (WHEEL.rimRightHanded)
            rightSpoke = !rightSpoke;

        //sets nippleAngle and hubAngle to the default angle (Radially Spoked)
        var nippleAngle = loopAngle;
        var hubAngle = loopAngle;

        //cross em!
        //if it's a leading spoke, it advances the spoke x holes clockwise
        //if it's a trailing spoke, it advances the spoke x holes cclockwise
        if ( leads )
            hubAngle += 2 * (360/spokeNumber) * WHEEL.spokeCrossings;
        else
            hubAngle -=  2 * (360/spokeNumber) * WHEEL.spokeCrossings;

        //options on whether the spokes have their heads on the inside/outside
        //of the hub flange
        if ((rightSpoke && WHEEL.rightLeadingSpokesIn)
                        || (!rightSpoke && WHEEL.leftLeadingSpokesIn))
            facingOut = !facingOut;

        //first point is location of the nipple the spoke goes to
        //x and y positions are found using cos/sin of an angle * the rim radius
        var nipX = (Math.cos(nippleAngle * toRad) * WHEEL.rimDiameter/2);
        var nipY = (Math.sin(nippleAngle * toRad) * WHEEL.rimDiameter/2);
        var nipZ = rightSpoke ? WHEEL.rimHoleOffset : -WHEEL.rimHoleOffset;
        var nipPt = new THREE.Vector3( nipX, nipY, nipZ)

        //second point generated from where in the hub the spoke comes from

        //determines the placement of the spoke head on the inside/outside
        //of the hub flange

        var spokeFlangeZOffset = rightSpoke ? WHEEL.rFlangeToCenter : WHEEL.lFlangeToCenter;

        if ( rightSpoke ^ facingOut )
            spokeFlangeZOffset += (WHEEL.flangeWidth/2) + (WHEEL.spokeWidth/2);
        else
            spokeFlangeZOffset -= (WHEEL.flangeWidth/2) + (WHEEL.spokeWidth/2) ;

        var hubFlangeRadius = (rightSpoke? WHEEL.rFlangeDiameter : WHEEL.lFlangeDiameter)/2;

        var hubX = (Math.cos(hubAngle * toRad) * hubFlangeRadius);
        var hubY = (Math.sin(hubAngle * toRad) * hubFlangeRadius);
        var hubPt = new THREE.Vector3( hubX, hubY, spokeFlangeZOffset)

        var newSpoke = new Spoke(nipPt, hubPt, rightSpoke, facingOut, leads);

        this.spokeArray.push(newSpoke);
    }

    this.addPer = function(perc) {
        var progress = Math.floor(WHEEL.spokeNumber * (1-perc));
        for (var i=0; i<this.spokeArray.length; i++){
            if (i > progress-1)
                this.spokeArray[i].mesh.material = this.spokeArray[i].material;
            else
                this.spokeArray[i].mesh.material = minvis;
        }
    }

    this.addAll = function() {
        for (var i=0; i < WHEEL.spokeNumber; i++){
            this.addSpoke();
        }
        for (var i=0; i<this.spokeArray.length; i++)
            this.mesh.add(this.spokeArray[i].mesh);
    }
};

