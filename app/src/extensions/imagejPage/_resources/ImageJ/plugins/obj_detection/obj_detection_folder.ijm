// @Integer rmin
// @Integer rmax
// @Integer by
// @String thrMethod
// @Integer min
// @Integer max
// @BigDecimal(stepSize=0.0001) fraction
// @Integer toll
// @File(label="Select the input directory", style="directory") imagesDir
// @File(label="Select an output directory for the points", style="directory") outFolderP
// @File(label="Select an output directory for the objects", style="directory") outFolderO

setBatchMode(true);
run("Input/Output...", "file=.csv");
list = getFileList(imagesDir);

for (i = 0; i < list.length; i++){
  IJ.log(list[i]);
  showProgress((i+1)/(list.length));
  open(imagesDir + "/"+ list[i]);
  width=getWidth();
  height=getHeight();
  nslice=nSlices();
  if (max <=0){
  max=width*height*nslice;
  }
  titleOriginal=getTitle();

  factor=3/sqrt(2);
  rmin=factor*rmin-0.5;
  rmax=factor*rmin-0.5;
  by=floor(factor*by-0.5);
  if (by<=0) by=1;
  if (rmin<1) rmin = 1;
  if (rmax<rmin+1) rmax = rmin+1;

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
  rename(titleOriginal);
  run("ObjCounter",  "threshold=1 slice="+floor(depth)+" min. ="+min+" max.="+max +" fraction="+fraction+" tollerance="+toll+" objects export_points");
  save(outFolderO+"/objects_"+titleOriginal);
  close();
  saveAs("Results", outFolderP + "/points_"+titleOriginal+".csv");
  close("*");
}
