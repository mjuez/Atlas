arguments = getArgument();
argument = split(arguments,'#');

imagePath = argument[0];
outputTitle = argument[1];
dimTiles = parseInt(argument[2]);
height = parseInt(argument[3]);
width = parseInt(argument[4]);
outputPath = argument[5];

outF = outputPath + File.separator + outputTitle + "_parts";
File.makeDirectory(outF);
setBatchMode(true);
numXTiles = height/dimTiles;
IJ.log(numXTiles);
numYTiles = width/dimTiles;

numTiles = -floor(-numXTiles) * -floor(-numYTiles);
acutalTile = 0;
for (x=0;x < width; x=x+dimTiles){
    for (y=0;y< height; y=y+dimTiles){
        run("Bio-Formats", "open=["+imagePath+"] color_mode=Default crop view=Hyperstack stack_order=XYCZT x_coordinate_1="+x+" y_coordinate_1="+y+" width_1=dimTiles height_1=dimTiles");
        saveAs("Tiff", outF + File.separator + outputTitle + "_X"+x/dimTiles + "_Y"+y/dimTiles+".tif");
        actualTile = actualTile + 1;
        IJ.log(actualTile+"/"+numTiles);
        close("*");
    }
}
