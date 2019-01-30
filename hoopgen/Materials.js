// Materials ///////////////////////////////////////////////////////////////////

var msred = new THREE.MeshPhongMaterial({
                    color:0xf67055,//ff7f66,
                    shininess: 0.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });

var msblue = new THREE.MeshPhongMaterial(
                {
                    color:0x84cde1,//98d5e6,
                    shininess: 0.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });

var msdkred = new THREE.MeshPhongMaterial(
                {
                    color:0xa14330,
                    shininess: 0.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });

var msdkblue = new THREE.MeshPhongMaterial(
                {
                    color:0x2a8eab,
                    shininess: 0.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });
var mdkred = new THREE.MeshPhongMaterial(
                {
                    color:0xa14330,
                    shininess: 100.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });

var mdkblue = new THREE.MeshPhongMaterial(
                {
                    color:0x2a8eab,
                    shininess: 100.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });

var mdkyellow = new THREE.MeshPhongMaterial(
                {
                    color:0x939b33,
                    shininess: 100.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });


var mdkyellowDbl = new THREE.MeshPhongMaterial(
                {
                    color:0x939b33,
                    shininess: 100.0,
                    side:THREE.DoubleSide,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });

var mdkredDbl = new THREE.MeshPhongMaterial(
                {
                    color:0xa14330,
                    side:THREE.DoubleSide,
                    shininess: 100.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });

var mdkblueDbl = new THREE.MeshPhongMaterial(
                {
                    color:0x2a8eab,
                    side:THREE.DoubleSide,
                    shininess: 100.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
                });

var mltgrey = new THREE.MeshPhongMaterial(
                {
                    color:0x666666,
                    shininess: 100.0,
                    emissive: 0x111111,
                    specular: 0xbbbbbb,
                    shading: THREE.FlatShading
               });
var minvis = new THREE.MeshPhongMaterial(
                {

                    transparent: true,
                    opacity:0.07
               });
var matArray = [ msred, msblue, mdkblue, mdkred, mdkredDbl, mdkblueDbl,
                                              mdkyellow, mdkyellowDbl, mltgrey];
