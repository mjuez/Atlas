arguments = getArgument();
argument = split(arguments,'#');

image = argument[0];
mapCreatorParams = argument[1];
mergeSlices = argument[2];

open(image);
if(mergeSlices == "true"){
    nslice=nSlices();
    if(nslice > 1){
        run("Z Project...", "projection=[Max Intensity]");
    }
}
run("Map creator", mapCreatorParams);