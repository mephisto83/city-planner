import bpy
import bmesh
import math
from mathutils import Vector, Matrix
from bmesh.types import BMVert
from bmesh.types import BMFace

class OverhangOutput:
    def __init__(self, left, right, top, bottom):
        self.left = left
        self.right = right
        self.top = top
        self.bottom = bottom
    def print(self):
        print("-------------------- over hang --------------------- ")
        print("left :  " + str(self.left))
        print("right :  " + str(self.right))
        print("top :  " + str(self.top))
        print("bottom :  " + str(self.bottom))
class PaneTrims:
    def __init__(self, panes, trims):
        self.trims = trims
        self.panes = panes
class CrossCutParameters:
    def __init__(self, x_count, y_count, x_cross_thickness, y_cross_thickness):
        self.x_count = x_count
        self.y_count = y_count
        self.x_cross_thickness = x_cross_thickness
        self.y_cross_thickness = y_cross_thickness
class DoorParameters:
    def __init__(self, jam_widths=.1):
        self.jam_widths = jam_widths
class DoorJamResult:
    def __init__(self, top, bottom, right, left, center):
        self.top = top
        self.bottom = bottom
        self.right = right
        self.left = left
        self.center = center
    def print(self):
        print("left :  " + str(self.left))
        print("right :  " + str(self.right))
        print("top :  " + str(self.top))
        print("bottom :  " + str(self.bottom))
        print("center :  " + str(self.center))
# make mesh
class ExtrudeObjectOutput:
    def __init__(self, faces, existing_faces, new_face_indices):
        self.topFace = faces[0].index
        self.new_faces = new_face_indices
        self.sideFaces = new_face_indices
        self.existing_faces = existing_faces
    def print(self):
        print("--------------Extrude Result--------------------------------------------")
        print("topFace : " + str(self.topFace))
        print("sideFaces : ")
        print(self.sideFaces)
        print("existing_faces : ")
        print(self.existing_faces)
        print("----------------------------------------------------------")
class LoopCutOutput:
    def __init__(self, existing_faces, new_face_indices):
        self.new_faces = new_face_indices
        self.pre_existing_edges = []
        self.new_edges = []
        self.existing_faces = existing_faces
        self.edge_length = None
    def print(self):
        print("-----Loop cut result-----------------------------------------------------")
        print("new_faces : ")
        print(self.new_faces)
        print("existing_faces : ")
        print(self.existing_faces)
        print("pre_existing_edges")
        print(self.pre_existing_edges)
        print("new edges")
        print(self.new_edges)
        if self.edge_length != None:
            print("edge length")
            print(self.edge_length)
        print("----------------------------------------------------------")
class BuildingTools:
    @staticmethod
    def extrudeObject(new_object, height, faceIndex, tag = None):
        bm = bmesh.new() 
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.normal_update()
        existing_faces = [face.index for face in bm.faces]
        _face = bm.faces[faceIndex]
        faces = [bm.faces[faceIndex]] 
        # Extrude 
        extruded = bmesh.ops.extrude_face_region(bm, geom=faces)
        # Move extruded geometry 
        translate_verts = [v for v in extruded['geom'] if isinstance(v, BMVert)] 
        bmesh.ops.translate(bm, vec=_face.normal*height, verts=translate_verts)
        # Delete original faces 
        bmesh.ops.delete(bm, geom=faces, context='FACES') 
        # Remove doubles 
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001) 
        # Update mesh and free Bmesh 
        bm.faces.ensure_lookup_table() 
        bm.normal_update() 
        updated_faces = [v for v in extruded['geom'] if isinstance(v, BMFace)]
        bm.faces.ensure_lookup_table() 
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        res = ExtrudeObjectOutput(updated_faces, existing_faces,new_face_indices)
        existing_faces = [face.index for face in bm.faces]
        bm.to_mesh(new_object.data) 
        bm.free()
        return res
    @staticmethod
    def extrudeFaces(new_object, height, faceindices):
        bm = bmesh.new() 
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.normal_update()
        existing_faces = [face.index for face in bm.faces]
        _face = bm.faces[faceindices[0]]
        faces = [bm.faces[face] for face in faceindices]
        # Extrude 
        extruded = bmesh.ops.extrude_face_region(bm, geom=faces)
        # Move extruded geometry 
        translate_verts = [v for v in extruded['geom'] if isinstance(v, BMVert)] 
        bmesh.ops.translate(bm, vec=_face.normal*height, verts=translate_verts)
        # Delete original faces 
        bmesh.ops.delete(bm, geom=faces, context='FACES') 
        # Remove doubles 
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001) 
        # Update mesh and free Bmesh 
        bm.faces.ensure_lookup_table() 
        bm.normal_update() 
        updated_faces = [v for v in extruded['geom'] if isinstance(v, BMFace)]
        bm.faces.ensure_lookup_table() 
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        res = ExtrudeObjectOutput(updated_faces, existing_faces,new_face_indices)
        existing_faces = [face.index for face in bm.faces]
        bm.to_mesh(new_object.data) 
        bm.free()
        return res
    @staticmethod
    def scaleFaceInline(face, verts, scale_factor):
        if isinstance(face, bmesh.types.BMFace):
            c = face.calc_center_median()
            for v in verts:
                v.co = c + scale_factor * (v.co - c)
    @staticmethod
    def extrudeScale(new_object, scale, faceIndex, d):
        bm = bmesh.new()
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.normal_update()
        existing_faces = [face.index for face in bm.faces]
        _face = bm.faces[faceIndex]
        faces = [bm.faces[faceIndex]] 
        v_cog = BuildingTools.getCOG(bm.faces[faceIndex].verts)
        # Extrude 
        extruded = bmesh.ops.extrude_face_region(bm, geom=faces)
        # Move extruded geometry 
        translate_verts = [v for v in extruded['geom'] if isinstance(v, BMVert)] 
        # f = bm.faces[faceIndex]
        BuildingTools.scaleFaceInline(_face, translate_verts, scale)
        #bmesh.ops.scale(bm, vec=scale, verts=translate_verts)
        # Delete original faces 
        bmesh.ops.delete(bm, geom=faces, context='FACES') 
        bm.faces.ensure_lookup_table() 
        bm.normal_update()
        # Remove doubles 
        # bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001) 
        # Update mesh and free Bmesh 
        bm.normal_update() 
        bm.faces.ensure_lookup_table() 
        updated_faces = [v for v in extruded['geom'] if isinstance(v, BMFace)]
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        res = ExtrudeObjectOutput(updated_faces, existing_faces,new_face_indices)
        bm.to_mesh(new_object.data) 
        bm.free()
        return res
    @staticmethod
    def scaleTo(new_object, sidewalk, faceIndex):
        mesh = new_object.data
        bm = bmesh.new() 
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.normal_update()
        
        lammy_x = lambda x : x.co[0]
        lammy_y = lambda x : x.co[1]
        verts = bm.faces[faceIndex].verts
        num_min_x, num_max_x = BuildingTools._getCOG(verts, lammy_x)    
        num_min_y, num_max_y = BuildingTools._getCOG(verts, lammy_y)
        width = num_max_x - num_min_x
        height = num_max_y - num_min_y
        x = BuildingTools.scaling(width, sidewalk)
        y = BuildingTools.scaling(height, sidewalk)
        bm.free()
        return BuildingTools.extrudeScale(new_object, Vector((x,y,0)), faceIndex, sidewalk)
    @staticmethod
    def scaleFace(new_object, sidewalk, faceIndex):
        mesh = new_object.data
        bm = bmesh.new() 
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.normal_update()
        face = bm.faces[faceIndex]
        face_normal = face.normal
        width, height = BuildingTools.getDimensions(new_object, faceIndex)
        x = BuildingTools.scaling(width, sidewalk)
        y = BuildingTools.scaling(height, sidewalk)
        bm.free()
        return BuildingTools.extrudeScale(new_object, face_normal, faceIndex, sidewalk)
    @staticmethod
    def scaling(x , d):
        return (((d * 2) / x) - 1) / -1
    @staticmethod
    def loopcutFace(new_object, faceIndex, cuts, vertical=False):
        bm = bmesh.new()
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table() 
        bm.normal_update()
        existing_faces = [face.index for face in bm.faces]
        face = bm.faces[faceIndex]
        edge_length = None
        if vertical:
            edges = [face.edges[0], face.edges[2]]
            edge_length = face.edges[0]
        else:
            edges = [face.edges[1], face.edges[3]]
            edge_length = face.edges[1]
        temp_a = (edge_length.verts[0].co[0], edge_length.verts[0].co[1], edge_length.verts[0].co[2])
        temp_b = (edge_length.verts[1].co[0], edge_length.verts[1].co[1], edge_length.verts[1].co[2])
        use_cap_endpoint = False
        res = bmesh.ops.subdivide_edges(bm, edges=edges, cuts=cuts)
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table()
        previous_faces = [bm.faces[faceIndex]]
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        new_faces = [face for face in bm.faces if face.index > len(existing_faces)-1]
        shared_edges = BuildingTools.getSharedEdges(previous_faces, new_faces)
        res = LoopCutOutput(existing_faces, new_face_indices)
        res.new_edges = [edge.index for edge in shared_edges]
        res.edge_length = [Vector(temp_a), Vector(temp_b)]
        bm.normal_update()
        bm.to_mesh(new_object.data) 
        bm.free()
        return res
    @staticmethod
    def getEdgesWithVertsAndNotInFace(edges, face):
        f_edges = face.edges
        res = []
        
        for i in range(len(edges)):
            _e = edges[i]
            for f_e_i in range(len(f_edges)):
                f_e = f_edges[f_e_i]
                if f_e != _e:
                    if f_e.verts[0] == _e.verts[0] and f_e.verts[1] != _e.verts[1]:
                        res.append(_e)
                    elif f_e.verts[1] == _e.verts[1] and f_e.verts[0] != _e.verts[0]:
                        res.append(_e)
        return res
    @staticmethod
    def getFacesEdgeLoop(allfaces, face, faceEdge):
        f_edges = face.edges
        done = False
        currentEdge = face.edges[faceEdge]
        currentFace = face
        res_faces = [currentFace]
        res = [currentEdge]
        while not done:
            done = True
            for i in range(len(allfaces)):
                c_face = allfaces[i]
                if c_face != currentFace:
                    c_face_edges = c_face.edges
                    for j in range(len(c_face_edges)):
                        c_face_edge = c_face_edges[j]
                     
                        if c_face_edge == currentEdge:
                            for k in range(len(c_face_edges)):
                                if k != j or True:
                                    edge_to_check = c_face_edges[k]
                                    if BuildingTools.edgesAreParallel(currentEdge, edge_to_check):
                                        if edge_to_check not in res:
                                            res.append(edge_to_check)
                                            if c_face not in res_faces:
                                                res_faces.append(c_face)
                                            currentEdge = edge_to_check
                                            currentFace = c_face
                                            done = False
                                            break
                                            break
        return res, res_faces
    @staticmethod
    def edgesAreParallel(edge1, edge2):
        ev1 = Vector(edge1.verts[1].co) - Vector(edge1.verts[0].co)
        ev1_norm = ev1.normalized()
        ev2 = Vector(edge2.verts[1].co) - Vector(edge2.verts[0].co)
        ev2_norm = ev2.normalized()
        evt1_ev2 = ev1_norm.angle(ev2_norm)
        return evt1_ev2 < .01 or 3.141526 < evt1_ev2
    @staticmethod
    def slope(edge):
        vert1 = edge.verts[0]
        vert2 = edge.verts[1]
        x1 = vert1.co[0]
        x2 = vert2.co[0]
        y1 = vert1.co[1]
        y2 = vert2.co[1]
        z1 = vert1.co[2]
        z2 = vert2.co[2]
        if vert1.co[0] > vert2.co[0]:
            x2 = vert1.co[0]
            x1 = vert2.co[0]
            y2 = vert1.co[1]
            y1 = vert2.co[1]
        if x2 - x1 == 0:
            if y2 - y1 == 0: 
                return  "False"
            return (x2 - x1) / (y2 - y1)
        return (y2 - y1) / (x2 - x1)
    @staticmethod
    def loopcutAroundFromTop(new_object, faceIndex, cuts, vertical=False):
        bm = bmesh.new()
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table() 
        bm.normal_update()
        existing_faces = [face.index for face in bm.faces]
        face = bm.faces[faceIndex]
        edges = BuildingTools.getEdgesWithVertsAndNotInFace(bm.edges, face)
        use_cap_endpoint = False
        res = bmesh.ops.subdivide_edges(bm, edges=edges, cuts=cuts)
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table()
        # print(res)
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        new_faces = [face for face in bm.faces if face.index > len(existing_faces)-1]
        shared_edges = BuildingTools.getSharedEdges(bm.faces, new_faces)
        res = LoopCutOutput(existing_faces, new_face_indices)
        res.new_edges = [edge.index for edge in shared_edges]
        bm.normal_update()
        bm.to_mesh(new_object.data) 
        bm.free()
        return res 
    @staticmethod
    def loopCutAroundBuilding(new_object, faceIndex, cuts, vertical=False):
        bm = bmesh.new()
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table() 
        bm.normal_update()
        existing_faces = [face.index for face in bm.faces]
        face = bm.faces[faceIndex]
        faceEdgeIndex = 1
        if vertical:
            faceEdgeIndex = 0
        edges, faces = BuildingTools.getFacesEdgeLoop(bm.faces, face, faceEdgeIndex)
        use_cap_endpoint = False
        pre_existing_edges = [face.index for face in bm.edges if face.index > len(existing_faces)-1]
        res = bmesh.ops.subdivide_edges(bm, edges=edges, cuts=cuts)
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table()
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        new_faces = [face for face in bm.faces if face.index > len(existing_faces)-1]
        new_edge_indices = [edge.index for edge in bm.edges if edge.index > len(pre_existing_edges)-1]
        shared_edges = BuildingTools.getSharedEdges(faces, new_faces)
        res = LoopCutOutput(existing_faces, new_face_indices)
        res.pre_existing_edges = pre_existing_edges
        res.new_edges = [edge.index for edge in shared_edges]
        bm.normal_update()
        bm.to_mesh(new_object.data) 
        bm.free()
        return res
    @staticmethod
    def translateEdges(new_object, vect, edge_indices):
        bm = BuildingTools.buildBMesh()
        vertices = BuildingTools.getAllVertices(bm, edge_indices)
        bmesh.ops.translate(bm, vec=vect, verts=vertices)
        BuildingTools.close(bm, new_object)
    @staticmethod
    def close(bm, new_object):
        bm.normal_update()
        bm.to_mesh(new_object.data) 
        bm.free()
    @staticmethod
    def getAllVertices(bm, edges_indices):
        vertices = []
        for i in range(len(edges_indices)):
            index = edges_indices[i]
            edge = bm.edges[index]
            if edge.verts[0] not in vertices:
                vertices.append(edge.verts[0])
            if edge.verts[1] not in vertices:
                vertices.append(edge.verts[1])
        return vertices
            
    @staticmethod
    def buildBMesh():
        bm = bmesh.new()
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table() 
        bm.normal_update()
        return bm
    @staticmethod 
    def getSharedEdges(a_faces, b_faces):
        all_a_faces_edges = BuildingTools.getAllEdges(a_faces)
        all_b_faces_edges = BuildingTools.getAllEdges(b_faces)
        result = []
        for i in range(len(all_a_faces_edges)):
            edge = all_a_faces_edges[i]
            if edge in all_b_faces_edges:
                if edge not in result:
                    result.append(edge)
        return result

    @staticmethod
    def getAllEdges(faces):
        result = []
        for i in range(len(faces)):
            face = faces[i]
            edges = BuildingTools.getEdges(face)
            for e in range(len(edges)):
                edge = edges[e]
                result.append(edge)
        return result
    @staticmethod
    def getEdges(face):
        return face.edges
    @staticmethod   
    def getCOG(o):
        lammy_x = lambda x : x.co[0]
        lammy_y = lambda x : x.co[1]
        lammy_z = lambda x : x.co[2]
        num_min_x, num_max_x = BuildingTools._getCOG(o, lammy_x)
        num_min_y, num_max_y = BuildingTools._getCOG(o, lammy_y)
        num_min_z, num_max_z = BuildingTools._getCOG(o, lammy_z)
        return Vector(((num_max_x - num_min_x) / 2, (num_max_y - num_min_y) / 2, (num_max_z - num_min_z) / 2))
    @staticmethod
    def _getCOG(vertices, lamb):
        num_min = None
        num_max = None
        for i in range(len(vertices)):
            vertex = vertices[i]
            v = lamb(vertex)
            if num_min == None:
                num_min = v
                num_max = v
            else:
                if num_min > v:
                    num_min = v
                if num_max < v:
                    num_max = v
        return num_min, num_max
    @staticmethod
    def moveEdgesTo(new_object, rel_position, edges):
        bm = BuildingTools.buildBMesh()
        vertices = BuildingTools.getAllVertices(bm, [edges[0]])
        position = vertices[0].co
        BuildingTools.close(bm, new_object)
        if 'z' in rel_position:
            z_position = rel_position['z']
            temp_z = z_position - position[2]
            BuildingTools.translateEdges(new_object, Vector((0, 0, temp_z)), edges)
            
        if 'y' in rel_position:
            z_position = rel_position['y']
            temp_z = z_position - position[1]
            BuildingTools.translateEdges(new_object, Vector((0, temp_z, 0)), edges)
            
        if 'x' in rel_position:
            z_position = rel_position['x']
            temp_z = z_position - position[0]
            BuildingTools.translateEdges(new_object, Vector((temp_z, 0, 0)), edges)
    @staticmethod
    def moveEdgeAlong(new_object, meter_from_edge, edge_length, edges):
        start = edge_length[0]
        end = edge_length[1]
        length = (start - end).length
        endpoint = 0
        half_way = start.lerp(end, .5)
        half_length = (start - half_way).length
        if meter_from_edge < 0:
            endpoint = half_length + meter_from_edge
            factor = endpoint / half_length
            spot = half_way.lerp(end, factor)
            move = spot - half_way
        else:
            endpoint = meter_from_edge
            factor = (half_length - endpoint ) / half_length
            spot = half_way.lerp(start, factor)
            move =  spot - half_way
        #print("endpoint : " + str(endpoint))
        #print("factor : " + str(factor))
        #print("start : " + str(start))
        #print("half_way : " + str(half_way))
        #print("half_length " + str(half_length))
        #print("end : " + str(end))
        #print("spot : " + str(spot))
        #print("move : " + str(move))
        BuildingTools.translateEdges(new_object, move, edges)
    @staticmethod 
    def cutPanel(new_object, faceIndex, vertical, relative_position):
        loopCutResult = BuildingTools.loopcutFace(new_object, faceIndex, 1, vertical)
        BuildingTools.moveEdgeAlong(new_object, relative_position, loopCutResult.edge_length, loopCutResult.new_edges)
        return loopCutResult
    @staticmethod
    def cutOverHang(new_object, faceIndex, thickness, overhang):
        left = faceIndex
        loopCutResult = BuildingTools.cutPanel(new_object, faceIndex, True, thickness)
        right = loopCutResult.new_faces[0]

        loopCutResult = BuildingTools.cutPanel(new_object, faceIndex, True, -thickness)
        top = loopCutResult.new_faces[0]
        multiply_ = 1
        if not overhang:
            multiply_ = -1
        loopCutResult = BuildingTools.cutPanel(new_object, loopCutResult.new_faces[0], False, multiply_ * thickness)
        bottom = loopCutResult.new_faces[0]
        res = OverhangOutput(left, right, top , bottom) 
        return res                  
    @staticmethod
    def buildJam(new_object, faceIndex, doorParameters):
        overhang = BuildingTools.cutOverHang(new_object, faceIndex, doorParameters.jam_widths, False)
        center = overhang.bottom
        top = overhang.top
        right = overhang.right
        left = overhang.left
        loopCutResult = BuildingTools.cutPanel(new_object, overhang.bottom, False, doorParameters.jam_widths)
        #extrudedFaces = BuildingTools.extrudeFaces(new_object, .02, [overhang.left, overhang.top, overhang.right])
        bottom  = loopCutResult.new_faces[-1]
        return DoorJamResult(top, bottom, right, left, center)
    @staticmethod
    def buildDoor(new_object, faceIndex, doorParameters):
        overhang = BuildingTools.cutOverHang(new_object, faceIndex, doorParameters.jam_widths, False)
        loopCutResult = BuildingTools.cutPanel(new_object, overhang.bottom, False, doorParameters.jam_widths)
        BuildingTools.extrudeFaces(new_object, .02, [overhang.left, overhang.top, overhang.right, loopCutResult.new_faces[0]])
    @staticmethod
    def getDimensions(new_object, faceIndex):
        bm = BuildingTools.buildBMesh()
        face = bm.faces[faceIndex]
        edges = face.edges
        width = edges[0].calc_length()
        height = edges[1].calc_length()
        BuildingTools.close(bm, new_object)
        return width, height
    @staticmethod
    def buildCrossCut(new_object, faceIndex, parameters):
        width, height = BuildingTools.getDimensions(new_object, faceIndex)
        panel_width = width / parameters.x_count
        panel_height = height / parameters.y_count
        x_cut_panel_face_ids = [faceIndex]
        x_cross_thickness = parameters.x_cross_thickness
        y_cross_thickness = parameters.y_cross_thickness
        panes = []
        trims = []
        for i in range(parameters.x_count - 1):
            lcr = BuildingTools.cutPanel(new_object, faceIndex, True, -panel_width)
            #BuildingTools.cutPanel(new_object, lcr.new_faces[0], True, .01)
            #BuildingTools.cutPanel(new_object, lcr.new_faces[0], False, .01)
            #BuildingTools.cutPanel(new_object, lcr.new_faces[0], True, -.01)
            #BuildingTools.cutPanel(new_object, lcr.new_faces[0], False, -.01)
            #temp = BuildingTools.scaleFace(new_object, .0004, lcr.new_faces[0])
            x_cut_panel_face_ids.append(lcr.new_faces[0])
        y_cut_panel_faces_ids = []
        for i in range(len(x_cut_panel_face_ids)):
            id_rev = x_cut_panel_face_ids[ i]
            lcr = BuildingTools.cutPanel(new_object, id_rev, True, x_cross_thickness/2)
            trims.append(id_rev)
            y_cut_panel_faces_ids.append(lcr.new_faces[0])
            lcr = BuildingTools.cutPanel(new_object, lcr.new_faces[0], True, -x_cross_thickness/2)
            trims.append(lcr.new_faces[0])
        for i in range(len(y_cut_panel_faces_ids)):
            id_rev = y_cut_panel_faces_ids[i]
            pre_id_rev = id_rev
            xy_cut_panel_face_ids = []
            for j in range(parameters.y_count):
                lcr = BuildingTools.cutPanel(new_object, id_rev, False, panel_height)
                pre_id_rev = lcr.new_faces[0]
                xy_cut_panel_face_ids.append(pre_id_rev)
            for k in range(len(xy_cut_panel_face_ids)):
                id_rev = xy_cut_panel_face_ids[k]
                trims.append(id_rev)
                lcr = BuildingTools.cutPanel(new_object, id_rev, False, -y_cross_thickness/2)
                panes.append(lcr.new_faces[0])
                lcr = BuildingTools.cutPanel(new_object, lcr.new_faces[0], False, y_cross_thickness/2)    
                trims.append(lcr.new_faces[0])
        #print("--------------trims #####################")
        #print(trims)
        #print("--------------panes #####################")
        #print(panes)
        return PaneTrims(panes, trims)
        #print(x_cut_panel_face_ids)
        #for f_index in range(len(x_cut_panel_face_ids)):
        #    faceId = x_cut_panel_face_ids[f_index]
        #    xy_cut_panel_face_ids.append(faceId) 
        #    for i in range(parameters.y_count - 1):      
        #        lcr = BuildingTools.cutPanel(new_object, faceId, False, -panel_height)
        #        xy_cut_panel_face_ids.append(lcr.new_faces[0])
        #print(xy_cut_panel_face_ids)
size = 50
floors = 10
floor_height = 4.3
height = floors * floor_height
vertices = [(0, 0, 0), (0, size, 0), (size*2, size, 0), (size*2, 0, 0)]

edges = [(0,1), (1,2), (2, 3), (3,0)]
faces = [(0, 1, 2, 3)]
new_mesh = bpy.data.meshes.new('new_mesh')
new_mesh.from_pydata(vertices, edges, faces)
new_mesh.update()
context = bpy.context
# make object from mesh
new_object = bpy.data.objects.new('new_object', new_mesh)
# make collection
new_collection = bpy.data.collections.new('new_collection')
bpy.context.scene.collection.children.link(new_collection)
# add object to scene collection
new_collection.objects.link(new_object)

sidewalk = 1.2192
street = 10.6
sidewalkheight = 0.1524
secondStageSizeDifference = 2
scaleResult = BuildingTools.scaleTo(new_object, street, 0)
print("#############################################################")
scaleResult.print()
extrudeResult = BuildingTools.extrudeObject(new_object, sidewalkheight, scaleResult.topFace)
scaleResult = BuildingTools.scaleTo(new_object, sidewalk, extrudeResult.topFace)
scaleResult.print()
extrudeResult = BuildingTools.extrudeObject(new_object, height, scaleResult.topFace, "first_floor")
extrudeResult.print()
firstFloorInfo = extrudeResult
levels = []
for y in range(1):
    loopCutResult = BuildingTools.loopCutAroundBuilding(new_object, firstFloorInfo.sideFaces[2], 1, False)
    firstFloorInfoCut = loopCutResult
    loopCutResult.print()
    BuildingTools.moveEdgesTo(new_object, {'z': 3 * y + 4 }, loopCutResult.new_edges)
    levels.append(firstFloorInfoCut)
    temp = BuildingTools.loopCutAroundBuilding(new_object, firstFloorInfo.sideFaces[2], 1, False)
    BuildingTools.moveEdgesTo(new_object, {'z': 3 * y + 5 }, temp.new_edges)
    #BuildingTools.cutOverHang(new_object, firstFloorInfoCut.new_faces[3], 1, True)
    #BuildingTools.cutOverHang(new_object, firstFloorInfoCut.new_faces[2], 1, False)
    #BuildingTools.cutOverHang(new_object, firstFloorInfoCut.new_faces[1], 1, True)
chuncks = []
if True:
    for t in range(len(levels)):
        firstFloorInfoCut = levels[t]
        jlength = len(firstFloorInfoCut.new_faces)
        firstFloorInfoCut.print()
        for j in range(jlength):
            side_face = firstFloorInfoCut.new_faces[j]
            width, height = BuildingTools.getDimensions(new_object, side_face)
            #print("width: "+ str(width)+ ", height" + str(height))
            #print(side_face)
            face_cuts =  math.floor(width / 4)
            #for i in range(face_cuts):
                #width_step = width / face_cuts
                #print("$$$$4$$$$$$$$$$$$$$$$$$$$")
            firstFloorPanel_Cut = BuildingTools.loopcutFace(new_object, side_face, face_cuts, True)
            firstFloorPanel_Cut.print()
                #print("$$$$4$$$$$$$$$$$$$$$$$$$$")
            for i in range(len(firstFloorPanel_Cut.new_faces)):
                jam_result = BuildingTools.buildJam(new_object, firstFloorPanel_Cut.new_faces[i], DoorParameters(jam_widths=1))
                #BuildingTools.buildJam(new_object, jam_result.center, DoorParameters(jam_widths=.2))
                #print("$$$$4$$$$$$$$$$$$$$$$$$$$")
                #jam_result.print()
                # ccrulet = BuildingTools.buildCrossCut(new_object, jam_result.center, CrossCutParameters(3, 3, .1, .1))
                #chuncks.append(jam_result.center)
print(levels)
for i in range(len(chuncks)):
    center = chuncks[i]
    #print(chuncks)
    #print(chuncks[i])
    #ccrulet = BuildingTools.buildCrossCut(new_object, center, CrossCutParameters(3, 3, .1, .1))
#chuncks = sorted(chuncks)

#for i in  range(2):    
    #ccrulet = BuildingTools.buildCrossCut(new_object, jam_result.center, CrossCutParameters(3, 3, .1, .1))
    #extrudedFaces = BuildingTools.extrudeFaces(new_object, .02, ccrulet.trims)
#print(chuncks)
#overhang = BuildingTools.cutOverHang(new_object, firstFloorInfoCut.new_faces[0], 1, False)
#overhang2 = BuildingTools.cutOverHang(new_object, overhang.bottom, 1, False)
#BuildingTools.extrudeFaces(new_object, 4, [overhang2.bottom])
#BuildingTools.extrudeFaces(new_object, 3, [overhang2.left, overhang2.top, overhang2.right])
#BuildingTools.extrudeFaces(new_object, 2, [overhang.left, overhang.top, overhang.right])
#overhang.print()
#loopCutResult = BuildingTools.loopcutFace(new_object, firstFloorInfoCut.new_faces[3], 1, True)
#loopCutResult.print()
#BuildingTools.moveEdgesTo(new_object, {'x': 88.181 - 2}, loopCutResult.new_edges)
#BuildingTools.moveEdgeAlong(new_object,-1, loopCutResult.edge_length, loopCutResult.new_edges)

#loopCutResult = BuildingTools.loopcutFace(new_object, loopCutResult.new_faces[0], 1, False)
#loopCutResult.print()
#BuildingTools.moveEdgeAlong(new_object,.5, loopCutResult.edge_length, loopCutResult.new_edges)
#firstFloorInfoCut.print()
#loopCutResult = BuildingTools.loopcutFace(new_object, firstFloorInfo.sideFaces[1], 4, False)

#loopCutResult = BuildingTools.loopcutFace(new_object, firstFloorInfo.sideFaces[2], 4, False)

#loopCutResult = BuildingTools.loopcutFace(new_object, firstFloorInfo.sideFaces[3], 4, False)
#loopCutResult = BuildingTools.loopCutAroundBuilding(new_object, extrudeResult.new_faces[1], 1, False)



#scaleResult = BuildingTools.scaleTo(new_object, secondStageSizeDifference, extrudeResult.topFace)
#scaleResult.print()
#extrudeResult = BuildingTools.extrudeObject(new_object, height, scaleResult.topFace)
#extrudeResult.print()
#secondFloorInfo = extrudeResult

#scaleResult = BuildingTools.scaleTo(new_object, secondStageSizeDifference, extrudeResult.topFace)
#scaleResult.print()
#extrudeResult = BuildingTools.extrudeObject(new_object, height, scaleResult.topFace)
#extrudeResult.print()
#thirdFloorInfo = extrudeResult

#scaleResult = BuildingTools.scaleTo(new_object, secondStageSizeDifference, extrudeResult.topFace)
#scaleResult.print()
#extrudeResult = BuildingTools.extrudeObject(new_object, height, scaleResult.topFace)
#extrudeResult.print()
#fourthFloorInfo = extrudeResult

#loopCutResult = BuildingTools.loopcutAroundFromTop(new_object, extrudeResult.topFace, floors, False)
#loopCutResult.print()
#firstFloorInfo.print()
