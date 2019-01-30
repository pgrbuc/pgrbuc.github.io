function initGUI(){

    // Main Gui ////////////////////////////////////////////////////////////////
    datGui = new dat.GUI({width:380,  autoPlace:false});

    datDom = datGui.domElement;
    datDom.style.font = "400 14px Verdana, Arial, sans-serif";
    datDom.style.position="absolute";
    datDom.style.zindex="9";
    datDom.style.top="0px";
    document.getElementById('wheelRenderer').appendChild(datDom);

    var rimGui = datGui.addFolder( 'Rim: (in mm)' );
    rimGui.domElement.style.font = "400 14px Verdana, Arial, sans-serif";

    var hubGui = datGui.addFolder( 'Hub:' );
    hubGui.domElement.style.font = "400 14px Verdana, Arial, sans-serif";

    var spokeGui = datGui.addFolder( 'Spokes:' );
    spokeGui.domElement.style.font = "400 14px Verdana, Arial, sans-serif";

    var miscGui = datGui.addFolder( 'Display' );
    miscGui.domElement.style.font = "400 14px Verdana, Arial, sans-serif";

    function updateGUI(){
        for (var i in hubGui.__controllers)
            hubGui.__controllers[i].updateDisplay();

        spokeGuiVar.guiRightSpokeLength = rSpokeCalc();
        spokeGuiVar.guiLeftSpokeLength = lSpokeCalc();;

    }

    function hardUpdateGUI(){
        for (var i in datGui.__controllers)
            datGui.__controllers[i].updateDisplay();

        for (var i in rimGui.__controllers)
            rimGui.__controllers[i].updateDisplay();

        for (var i in hubGui.__controllers)
            hubGui.__controllers[i].updateDisplay();

        for (var i in miscGui.__controllers)
            miscGui.__controllers[i].updateDisplay();

        for (var i in spokeGui.__controllers)
            spokeGui.__controllers[i].updateDisplay();

        spokeGuiVar.guiRightSpokeLength = rSpokeCalc();
        spokeGuiVar.guiLeftSpokeLength = lSpokeCalc();;

    }

    // Rim Gui /////////////////////////////////////////////////////////////////
    var rimGuiVar = {
        guiRimDiameter: WHEEL.rimDiameter,

        diameterUpdate: function(){
            WHEEL.rimDiameter = rimGuiVar.guiRimDiameter;
            WHEEL.rimObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },

        guiRimWidth: WHEEL.rimWidth,

        rimWidthUpdate: function(){
            WHEEL.rimWidth = rimGuiVar.guiRimWidth;
            WHEEL.rimObj.needsUpdate = true;
            updateGUI();
        },

        guiRimDepth: WHEEL.rimDepth,

        rimDepthUpdate: function(){
            WHEEL.rimDepth = rimGuiVar.guiRimDepth;
            WHEEL.rimObj.needsUpdate = true;
            updateGUI();
        },

        guiSpokeOffset : WHEEL.rimHoleOffset,

        rimHoleOffsetUpdate: function(){
            WHEEL.rimHoleOffset = rimGuiVar.guiSpokeOffset;
            WHEEL.rimObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },

        guiSpokeOffsetBool : false,

        rimHoleOffsetBoolUpdate: function(){
            WHEEL.rimRightHanded = !WHEEL.rimRightHanded;
            WHEEL.rimObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },
    }

    rimGui.add(rimGuiVar, 'guiRimDiameter', 265,700)
        .name('Diameter')
        .onChange(rimGuiVar.diameterUpdate);

    rimGui.add(rimGuiVar, 'guiRimWidth', 10, 50)
        .name('Width')
        .onChange(rimGuiVar.rimWidthUpdate);

    rimGui.add(rimGuiVar, 'guiRimDepth', 10, 50)
        .name('Depth')
        .onChange(rimGuiVar.rimDepthUpdate)

    rimGui.add(rimGuiVar, 'guiSpokeOffset', 0.0, 3.0)
        .name('Hole Offset')
        .onChange(rimGuiVar.rimHoleOffsetUpdate);

    rimGui.add(rimGuiVar, 'guiSpokeOffsetBool')
        .name('Switch Offset')
        .onChange(rimGuiVar.rimHoleOffsetBoolUpdate);

    // Hub Gui /////////////////////////////////////////////////////////////////
    var hubGuiVar ={

        guiFlangeLock: true,
        flangeLockUpdate: function (){
            hubGuiVar.guiLFlangeDiameter = hubGuiVar.guiRFlangeDiameter;
            WHEEL.lFlangeDiameter = hubGuiVar.guiLFlangeDiameter;
            WHEEL.rFlangeDiameter = hubGuiVar.guiRFlangeDiameter;

            hubGuiVar.guiLFlangeToCenter = hubGuiVar.guiRFlangeToCenter;
            WHEEL.lFlangeToCenter = hubGuiVar.guiLFlangeToCenter;
            WHEEL.rFlangeToCenter = hubGuiVar.guiRFlangeToCenter;
            WHEEL.hubObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },

        guiLFlangeDiameter: WHEEL.lFlangeDiameter,
        lFlangeDiameterUpdate: function (){
            if (hubGuiVar.guiFlangeLock)
                hubGuiVar.guiRFlangeDiameter = hubGuiVar.guiLFlangeDiameter;

            WHEEL.lFlangeDiameter = hubGuiVar.guiLFlangeDiameter;
            WHEEL.rFlangeDiameter = hubGuiVar.guiRFlangeDiameter;
            WHEEL.hubObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },

        guiRFlangeDiameter: WHEEL.rFlangeDiameter,
        rFlangeDiameterUpdate: function (){
            if (hubGuiVar.guiFlangeLock)
                hubGuiVar.guiLFlangeDiameter = hubGuiVar.guiRFlangeDiameter

            WHEEL.rFlangeDiameter = hubGuiVar.guiRFlangeDiameter;
            WHEEL.lFlangeDiameter = hubGuiVar.guiLFlangeDiameter;
            WHEEL.hubObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },

        guiLFlangeToCenter: WHEEL.lFlangeToCenter,
        lFlangeToCenterUpdate: function (){
            if (hubGuiVar.guiFlangeLock)
                hubGuiVar.guiRFlangeToCenter = hubGuiVar.guiLFlangeToCenter

            WHEEL.lFlangeToCenter = hubGuiVar.guiLFlangeToCenter;
            WHEEL.rFlangeToCenter = hubGuiVar.guiRFlangeToCenter;
            WHEEL.hubObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },

        guiRFlangeToCenter: WHEEL.rFlangeToCenter,
        rFlangeToCenterUpdate: function (){
            if (hubGuiVar.guiFlangeLock)
                hubGuiVar.guiLFlangeToCenter = hubGuiVar.guiRFlangeToCenter;
            WHEEL.rFlangeToCenter = hubGuiVar.guiRFlangeToCenter;
            WHEEL.lFlangeToCenter = hubGuiVar.guiLFlangeToCenter;
            WHEEL.hubObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },
    }


    hubGui.add(hubGuiVar, 'guiLFlangeDiameter', 30, 200)
        .name('Hole Diameter L Flange')
        .onChange(hubGuiVar.lFlangeDiameterUpdate);

    hubGui.add(hubGuiVar, 'guiRFlangeDiameter', 30, 200)
        .name('Hole Diameter R Flange')
        .onChange(hubGuiVar.rFlangeDiameterUpdate);

    hubGui.add(hubGuiVar, 'guiLFlangeToCenter', 30, 150)
        .name('Left Flange Dist to Center')
        .onChange(hubGuiVar.lFlangeToCenterUpdate);

    hubGui.add(hubGuiVar, 'guiRFlangeToCenter', 30, 150)
        .name('Right Flange Dist to Center')
        .onChange(hubGuiVar.rFlangeToCenterUpdate);

    hubGui.add(hubGuiVar, 'guiFlangeLock')
        .name('Symetric Hub')
        .onChange(hubGuiVar.flangeLockUpdate);

    // Spoke Gui ///////////////////////////////////////////////////////////////
      spokeGuiVar ={

       guiSpokeNumber : WHEEL.spokeNumber,

       spokeNumberUpdate: function(){
            WHEEL.spokeNumber = spokeGuiVar.guiSpokeNumber;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },

        guiSpokeCrossings : WHEEL.spokeCrossings,
        crossings : function(){
            WHEEL.spokeCrossings = spokeGuiVar.guiSpokeCrossings;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },

        guiLeftLeadingSpokesIn : WHEEL.leftLeadingSpokesIn,

        lLacing : function(){
            WHEEL.leftLeadingSpokesIn = !WHEEL.leftLeadingSpokesIn;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
            return true;
        },

        guiRightLeadingSpokesIn : WHEEL.rightLeadingSpokesIn,

        rLacing : function(){
            WHEEL.rightLeadingSpokesIn = !WHEEL.rightLeadingSpokesIn;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
            return true;
        },

        guiRightSpokeLength : rSpokeCalc(),

        rSpokeLenUpdate : function(){
            updateGUI();
        },

        guiLeftSpokeLength : lSpokeCalc(),

        lSpokeLenUpdate : function(){
            updateGUI();
        },

    }

    spokeGui.add(spokeGuiVar, 'guiSpokeNumber', 8, 100)
        .name('Spoke Holes')
        .step(4)
        .onChange(spokeGuiVar.spokeNumberUpdate);

    spokeGui.add(spokeGuiVar, 'guiSpokeCrossings', 0, 5)
        .name('Spoke Crossings')
        .step(1)
        .onChange(spokeGuiVar.crossings);

    spokeGui.add(spokeGuiVar, 'guiLeftLeadingSpokesIn')
        .name('Left Leading Spokes In')
        .onChange(spokeGuiVar.lLacing);

    spokeGui.add(spokeGuiVar, 'guiRightLeadingSpokesIn')
        .name('Right Leading Spokes In')
        .onChange(spokeGuiVar.rLacing);

    spokeGui.add(spokeGuiVar, 'guiRightSpokeLength')
        .name('Right Spoke Length')
        .step(0.5)
        .listen()
        .onChange(spokeGuiVar.rSpokeLenUpdate);

    spokeGui.add(spokeGuiVar, 'guiLeftSpokeLength')
        .name('Left Spoke Length')
        .step(0.5)
        .listen()
        .onChange(spokeGuiVar.lSpokeLenUpdate);

    /** Misc Gui /////////////////////////////////////////////////////////////*/
    var miscGuiVar ={
        guiWireBool : false,
        wireframe : function (){
            for (var i=0; i<matArray.length; i++){
                matArray[i].wireframe = !(matArray[i].wireframe);
                matArray[i].needsUpdate = true;
            }
            return true;
        },

        guiSegmentSize : WHEEL.segmentSize,
        polycount : function (){
            WHEEL.segmentSize = miscGuiVar.guiSegmentSize;
            WHEEL.hubObj.needsUpdate = true;
            WHEEL.rimObj.needsUpdate = true;
            WHEEL.spokesObj.needsUpdate = true;
            updateGUI();
        },
    }


    miscGui.add(miscGuiVar, 'guiSegmentSize', 1, 10)
        .name('Polycount Simplicity')
        .step(1)
        .onChange(miscGuiVar.polycount);

    miscGui.add(miscGuiVar, 'guiWireBool')
        .name('Toggle Wire Frame')
        .onChange(miscGuiVar.wireframe);

    // Open Gui Folders ////////////////////////////////////////////////////////
    miscGui.open();
    spokeGui.open();
    rimGui.open();
    hubGui.open();
    datGui.close();
}
