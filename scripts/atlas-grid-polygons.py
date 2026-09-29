"""Polygonize an already projected grid without loading GDAL.

Used only with an explicitly supplied, retained farming projection cache.
Cell edges and the 4-connected polygon components match the grid geometry.
"""
import math
import numpy as np
from shapely.geometry import box, shape, mapping
from shapely.ops import unary_union, transform
from shapely import contains_xy

def from_bounds(w,s,e,n,width,height):return (w,s,e,n,width,height)
def transform_geom(src,dst,g,precision=None):
 if src==dst:return g
 def project(x,y,z=None):
  x=np.asarray(x);y=np.asarray(y)
  if src=='EPSG:4326':return (x*math.pi/180*6378137,np.log(np.tan(math.pi/4+y*math.pi/360))*6378137)
  return (x/6378137*180/math.pi,(2*np.arctan(np.exp(y/6378137))-math.pi/2)*180/math.pi)
 result=mapping(transform(project,shape(g)))
 if precision is not None:
  def rounded(v):return [rounded(x) for x in v] if isinstance(v,(list,tuple)) else round(v,precision)
  result['coordinates']=rounded(result['coordinates'])
 return result
def geometry_mask(geometries,out_shape,transform,invert=False):
 w,s,e,n,width,height=transform
 x=w+(np.arange(width)+.5)*(e-w)/width;y=n-(np.arange(height)+.5)*(n-s)/height
 xx,yy=np.meshgrid(x,y);inside=contains_xy(unary_union([shape(g) for g in geometries]),xx,yy)
 return inside if invert else ~inside
def shapes(array,mask,transform):
 w,s,e,n,width,height=transform;dx=(e-w)/width;dy=(n-s)/height
 for value in np.unique(array[mask]):
  rectangles=[];cells=mask&(array==value)
  for row in range(height):
   changes=np.diff(np.r_[False,cells[row],False].astype('int8'))
   for left,right in zip(np.flatnonzero(changes==1),np.flatnonzero(changes==-1)):
    rectangles.append(box(w+left*dx,n-(row+1)*dy,w+right*dx,n-row*dy))
  union=unary_union(rectangles)
  for part in getattr(union,'geoms',[union]):
   if not part.is_empty:yield mapping(part),float(value)
