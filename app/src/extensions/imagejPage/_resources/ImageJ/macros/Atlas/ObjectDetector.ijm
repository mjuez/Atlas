arguments = getArgument();
argument = split(arguments,'#');

isFolder = argument[0];
path = argument[1];
rmin = argument[2];
rmax = argument[3];
by = argument[4];
thrMethod = argument[5];
min = argument[6];
max = argument[7];
fraction = argument[8];
toll = argument[9];
outputPath = argument[10];


factor=3/sqrt(2);
rmin=factor*rmin-0.5;
rmax=factor*rmin-0.5;
by=floor(factor*by-0.5);
if (by<=0) by=1;
if (rmin<1) rmin = 1;
if (rmax<rmin+1) rmax = rmin+1;

outFolderP = outputPath + File.separator +"points";
File.makeDirectory(outFolderP);
outFolderO = outputPath + File.separator +"objects";
File.makeDirectory(outFolderO);

setBatchMode(true);
run("Input/Output...", "file=.csv");

if(isFolder == "true"){
    list = getFileList(path);

    for (i = 0; i < list.length; i++){
        if ( !endsWith(list[i], File.separator) ){
            detectObjects(path + File.separator + list[i]);
        }
    }
}else{
    detectObjects(path);
}

function detectObjects(imagePath){
    open(imagePath);
    width=getWidth();
    height=getHeight();
    nslice=nSlices();
    if (max <=0){
    max=width*height*nslice;
    }
    title=getTitle();
    titleC = replace(title," ","_");

    run("Duplicate...", "duplicate range="+1+"-"+nslice+" title=temp1");
    run("Duplicate...", "duplicate range="+1+"-"+nslice+" title=temp0");
    run("Median...", "radius=1 stack");
    run("Median...", "radius=2 stack");
    selectWindow("temp1");
    // Bright blob detection with maximum of negative LoG at different scales
    run("32-bit");
    run("MaxLoGs", "min="+rmin+" max="+rmax+" steps="+by);
    rename("max");
    run("Enhance Contrast...", "saturated=0 normalize process_all");
    run("8-bit");
    run("Auto Threshold", "method="+thrMethod+" white stack");
    close("temp1");
    // end detection, a binary mask is generated
    titleTh=getTitle();
    // remove noise with a median filter from the original image
    selectWindow("temp0");
    imageCalculator("Min stack", "temp0" ,"max");
    depth=(nslice+1)/2;
    //setVoxelSize(sX,sY,sZ,"micron");
    //segmentation and object counting
    rename(title);
    outputObjects = outFolderO + File.separator+"objects_"+titleC;
    outputPoints = outFolderP + File.separator+"points_"+titleC+".csv";
    run("ObjCounter",  "silent=true threshold=1 slice="+floor(depth)+" min="+min+" max="+max +" fraction="+fraction+" tolerance="+toll+" export_objects=true export_points=true output_objects="+outputObjects+" output_points="+outputPoints);
    close("*");
    print('_DONE_');
}
