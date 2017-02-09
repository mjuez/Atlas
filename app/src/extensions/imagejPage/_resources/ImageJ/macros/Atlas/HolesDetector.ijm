arguments = getArgument();
argument = split(arguments,'#');

isFolder = argument[0];
path = argument[1];
radius = argument[2];
thrHoles = argument[3];
outputPath = argument[4];

outFolderH = outputPath + "/holes_img";
File.makeDirectory(outFolderH);
outFolderHcsv = outputPath + "/holes_pixels";
File.makeDirectory(outFolderHcsv);

//setBatchMode(true);
run("Input/Output...", "file=.txt");
run("Conversions...", " "); //avoid scaling when converting

if(isFolder == "true"){
    list = getFileList(path);

    for (i = 0; i < list.length; i++){
        if ( !endsWith(list[i],"/") ){
            detectHoles(path + "/"+ list[i]);
        }
    }
}else{
    detectHoles(path);
}

function detectHoles(imagePath){
    open(imagePath);
    width=getWidth();
    height=getHeight();   
    nslice=nSlices();
    title=getTitle();
    titleC = replace(title," ","_");
    rename("temp");
    run("Duplicate...", "duplicate range="+1+"-"+nslice+" title=temp1");
    selectWindow("temp1");
    run("Macro...", "code=v=-v+255 stack"); //invert intnsity
    run("Median...", "radius="+radius+" stack");
    run("Macro...", "code=[if (v<"+thrHoles+") v=0] stack");
    run("Macro...", "code=[if (v>="+thrHoles+") v=1] stack");
    //run("Minimum...", "radius=15 stack");
    //run("Maximum...", "radius=15 stack");
    selectWindow("temp1");
    run("Z Project...", "projection=[Sum Slices]");
    run("8-bit");
    rename("holes_"+titleC);
    save(outFolderH + "/holes_"+titleC);
    saveAs("Text Image", outFolderHcsv+"/holes_"+titleC+".txt");
    close("*");
}