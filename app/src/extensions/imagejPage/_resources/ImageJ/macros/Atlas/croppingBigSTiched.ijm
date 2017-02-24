arguments = getArgument();
argument = split(arguments,'#');

imagePath = argument[0];
output = argument[1];
dimTiles = argument[2];
height = argument[3];
width = argument[4];

outF = output + File.separator +"parts";
File.makeDirectory(outF);
setBatchMode(true);


//run ('Bio-Formats Macro Extensions')
//Ext.setId(imagePath);



for (x=0;x< width; x=x+dimTiles){
for (y=0;y< height; y=y+dimTiles){
run("Bio-Formats", "open=["+imagePath+"] color_mode=Default crop view=Hyperstack stack_order=XYCZT x_coordinate_1="+x+" y_coordinate_1="+y+" width_1=dimTiles height_1=dimTiles");
saveAs("Tiff", "algo_X"+x/dimTiles + " ");
close("*");
}
}
