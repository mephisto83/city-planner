bl_info = {
    "name": "City Planner",
    "description": "Blender projects can be generated with json files of a specific format.",
    "author": "aporter",
    "version": (0,0,1,0),
    "blender": (2, 80, 0),
    "category": "Animation",
    "location": "View3D"
}
import json
import bpy
import sys
class ExtrudeObjectOutput:
    def __init__(self, faces, existing_faces, new_face_indices):
        self.topFace = faces[0].index
        self.new_faces = new_face_indices
        self.existing_faces = existing_faces
class LoopCutOutput:
    def __init__(self, existing_faces, new_face_indices):
        self.new_faces = new_face_indices
        self.existing_faces = existing_faces
class BuildingTools:
    @staticmethod
    def extrudeObject(new_object, height, faceIndex):
        bm = bmesh.new() 
        depsgraph = bpy.context.evaluated_depsgraph_get()
        scene = bpy.context.scene
        bm.from_object(new_object, depsgraph)
        # Get geometry to extrude 
        bm.faces.ensure_lookup_table() 
        bm.normal_update()
        existing_faces = [face.index for face in bm.faces]
        print("existing_faces")
        print(existing_faces)
        _face = bm.faces[faceIndex]
        print(_face.normal)
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
        print("_face index = ")
        updated_faces = [v for v in extruded['geom'] if isinstance(v, BMFace)]
        print(updated_faces)
        bm.faces.ensure_lookup_table() 
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        res = ExtrudeObjectOutput(updated_faces, existing_faces,new_face_indices)
        existing_faces = [face.index for face in bm.faces]
        print("existing_faces")
        print(existing_faces)
        print("result of extruded faces")
        print(bm.faces)
        print(len(bm.faces))
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
        print(_face.normal)
        faces = [bm.faces[faceIndex]] 
        v_cog = BuildingTools.getCOG(bm.faces[faceIndex].verts)
        # Extrude 
        extruded = bmesh.ops.extrude_face_region(bm, geom=faces)
        print(extruded)
        # Move extruded geometry 
        translate_verts = [v for v in extruded['geom'] if isinstance(v, BMVert)] 
        print("bm.faces: " + str(len(bm.faces)))
        # f = bm.faces[faceIndex]
        BuildingTools.scaleFaceInline(_face, translate_verts, scale)
        #bmesh.ops.scale(bm, vec=scale, verts=translate_verts)
        # Delete original faces 
        bmesh.ops.delete(bm, geom=faces, context='FACES') 
        bm.faces.ensure_lookup_table() 
        bm.normal_update()
        print("d " + str(d))
        print("scale")
        print(scale)
        for i in range(len(translate_verts)):
            vert = translate_verts[i]
            print(vert)
            print(vert.co)
        # Remove doubles 
        # bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001) 
        # Update mesh and free Bmesh 
        bm.normal_update() 
        bm.faces.ensure_lookup_table() 
        
        print("translated verts")
        print(BuildingTools.getCOG(translate_verts))
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
        print("scaling to is " )
        print(bm.faces[faceIndex].index)
        verts = bm.faces[faceIndex].verts
        print("scale to verts")
        num_min_x, num_max_x = BuildingTools._getCOG(verts, lammy_x)    
        num_min_y, num_max_y = BuildingTools._getCOG(verts, lammy_y)
        print("num_min_x: " + str(num_min_x)+", num_max_x: " +  str(num_max_x))
        print("num_min_y: " + str(num_min_y)+", num_max_y: " +  str(num_max_y))
        width = num_max_x - num_min_x
        height = num_max_y - num_min_y
        x = BuildingTools.scaling(width, sidewalk)
        y = BuildingTools.scaling(height, sidewalk)
        print("x " + str(x) + " y " + str(y))
        bm.free()
        return BuildingTools.extrudeScale(new_object, Vector((x,y,0)), faceIndex, sidewalk)

    @staticmethod
    def scaling(x , d):
        return (((d * 2) / x) - 1) / -1
    @staticmethod
    def loopcut(new_object, faceIndex, cuts, vertical=False):
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
        if vertical:
            edges = [face.edges[0], face.edges[2]]
        else:
            edges = [face.edges[1], face.edges[3]]
        print(edges)
        use_cap_endpoint = False
        res = bmesh.ops.subdivide_edges(bm, edges=edges, cuts=cuts)
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table()
        # print(res)
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        res = LoopCutOutput(existing_faces, new_face_indices)
        bm.normal_update()
        bm.to_mesh(new_object.data) 
        bm.free()
        return res
    @staticmethod
    def getEdgesWithVertsAndNotInFace(edges, face):
        f_edges = face.edges
        res = []
        print("f_edges")
        print(f_edges)
        
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
    def loopcutAround(new_object, faceIndex, cuts, vertical=False):
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
        print(edges)
        use_cap_endpoint = False
        res = bmesh.ops.subdivide_edges(bm, edges=edges, cuts=cuts)
        bm.faces.ensure_lookup_table() 
        bm.edges.ensure_lookup_table()
        # print(res)
        new_face_indices = [face.index for face in bm.faces if face.index > len(existing_faces)-1]
        res = LoopCutOutput(existing_faces, new_face_indices)
        bm.normal_update()
        bm.to_mesh(new_object.data) 
        bm.free()
        return res 
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

class CityPlannerGUI(bpy.types.Panel):
    """Presentation GUI"""
    bl_space_type = "VIEW_3D"
    bl_region_type = "TOOLS"
    bl_context = "objectmode"
    # bl_category = "Movie"
    bl_label = "Generate Presentation"
 
    def draw(self, context):
        TheCol = self.layout.column(align=True)
        TheCol.prop(context.scene, "nodesfile")
        TheCol.prop(context.scene, "voronoifile")
        TheCol.operator("object.do_the_thing", text="Build City")

class DoTheThing(bpy.types.Operator):
    """Write Worlds"""
    bl_idname = "object.do_the_thing"
    bl_label = "Build City Plan"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        scene = context.scene
        print(context)
        print(self)
        self.context = context
        Blend.execute(context.scene.nodesfile, context.scene.voronoifile)
        return {'FINISHED'}

# store keymaps here to access after registration
# addon_keymaps = []
def register():
    bpy.utils.register_class(DoTheThing)
    bpy.utils.register_class(CityPlannerGUI)
    bpy.types.Scene.nodesfile = bpy.props.StringProperty \
      (name = "Nodes File",
        subtype = "FILE_PATH",
        description = "JSON")
    bpy.types.Scene.voronoifile = bpy.props.StringProperty \
      (name = "Voronoi File",
        subtype = "FILE_PATH",
        description = "JSON")
    bpy.types.VIEW3D_MT_object.append(menu_func)

def menu_func(self, context):
    self.layout.operator(DoTheThing.bl_idname)

def unregister():
    del bpy.types.Scene.nodesfile
    del bpy.types.Scene.voronoifile
    bpy.utils.unregister_class(CityPlannerGUI)
    bpy.utils.unregister_class(DoTheThing)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

class Diagram:
    def __init__(self, cells, edges, vertices, id):
        self.cells = cells
        self.edges = edges
        self.vertices = vertices
        self.id = id
        self.relative = None
    def setRelative(self, relative):
        self.relative = relative
class Cell:
    def __init__(self, site, halfedges, closeMe):
        self.site = site
        self.used = False
        self.halfedges = halfedges
        self.closeMe = closeMe
class Vertex:
    def __init__(self, x, y):
        self.x = x
        self.y = y
class Edge:
    def __init__(self, lSite, rSite, vb, va):
        self.lSite = lSite
        self.rSite = rSite
        self.vb = vb
        self.va = va
class Site:
    def __init__(self, x, y, voronoiId, w, h, section, id):
        self.x = x
        self.y = y 
        self.voronoiId = voronoiId
        self.w = w
        self.h = h
        self.section = section
        self.id = id
        
class HalfEdge:
    def __init__(self, site, edge, angle):
        self.site = site
        self.edge = edge
        self.angle = angle
        self.start = None
        self.end = None
    def setStartAndEnd(self, start, end):
        self.start = Voronoi.buildVertex(start)
        self.end = Voronoi.buildVertex(end)
class Vertex:
    def __init__(self, x, y):
        self.x = x 
        self.y = y
class NodeInfo:
    def __init__(self, voronoi, id, count, sectionType, name, type_, connectionCount, vertex):
        self.voronoi = voronoi
        self.id = id 
        self.count = count
        self.sectionType = sectionType
        self.name = name
        self.type = type_
        self.connectionCount = connectionCount
        self.vertex = vertex
        

    @staticmethod
    def decodeObj(obj):
        v_ = obj["v"]
        sectionInfo_ = v_["sectionInfo"]
        relative_ = v_["relative"]
        voronoi = None
        id = None
        count = None
        sectionType = None
        name = None
        type_ = None
        connectionCount = None
        vertex = None
        if "relative" in v_:
            vertex = Voronoi.buildVertex(relative_)
        if "voronoi" in v_:
            voronoi = v_["voronoi"]
        if "id" in sectionInfo_:
            id = sectionInfo_["id"]
        if "count" in sectionInfo_:
            count = sectionInfo_["count"]
        if "sectionType" in sectionInfo_:
            sectionType = sectionInfo_["sectionType"]
        if "type" in sectionInfo_:
            type_ = sectionInfo_["type"]
        if "connectionCount" in sectionInfo_:
            connectionCount = sectionInfo_["connectionCount"]
        nodeInfo = NodeInfo(voronoi, id, count, sectionType, name, type_, connectionCount, vertex)

        return nodeInfo
    @staticmethod
    def readFile(f):
        lines = f.readlines()
        nodeInfos = []
        for line in lines:
            obj = json.loads(line)
            v = NodeInfo.decodeObj(obj)
            nodeInfos.append(v)
        return nodeInfos
class Voronoi:
    @staticmethod
    def buildSite(site_):
        site = None
        y = None
        w = None
        h = None   
        section = None       
        id = None
        voronoiId = None
        x = None
        try:
            if "x" in site:
                x = site["x"]
                
            if "y" in site:
                y = site["y"]
                
            if "voronoiId" in site:
                voronoiId= site["voronoiId"]
                
            if "w" in site:
                w = site["w"]
                
            if "h" in site:
                h = site["h"]
                             
            if "section" in site:
                section = site["section"]
                         
            if "id" in site:
                id = site["id"]
            
            site = Site(x, y, voronoiId, w, h, section, id)
        except:
            site = Site(x, y, voronoiId, w, h, section, id)
        return site
    @staticmethod
    def buildVertex(va_):
        return Vertex(va_["x"], va_["y"])
    @staticmethod
    def buildEdge(edge_):
        lSite = None
        rSite = None
        va = None
        vb = None
        if "lSite" in edge_: 
            lSite = edge_["lSite"]
            lSite = Voronoi.buildSite(lSite)
        if "rSite" in edge_:
            rSite = edge_["rSite"]
            rSite = Voronoi.buildSite(rSite)
        if "vb" in edge_:
            vb = Voronoi.buildVertex(edge_["vb"])
        if "va" in edge_:
            va = Voronoi.buildVertex(edge_["va"])
        return Edge(lSite, rSite, vb, va)
    @staticmethod
    def decodeObj(obj):
        v_ = obj["v"]
        relative = v_["relative"]
        relative = Voronoi.buildVertex(relative)
        diagram_ = v_["diagram"]
        cells_ = diagram_["cells"]
        edges_ = diagram_["edges"]
        vertices_ = diagram_["vertices"]
        cells = []
        edges = []
        vertices = []
        for i in range(len(cells_)):
            cell_ = cells_[i]
            site_ = cell_["site"]
            site = Voronoi.buildSite(site_)
            halfedges_ = cell_["sortedHalfEdges"]
            halfedges = []
            for j in range(len(halfedges_)):
                halfedge_ = halfedges_[j]
                half_site_ = halfedge_["site"] 
                half_edge_ = halfedge_["edge"]
                half_site = Voronoi.buildSite(half_site_)
                half_edge = Voronoi.buildEdge(half_edge_)
                new_half_edge = HalfEdge(half_site, half_edge, halfedge_["angle"])
                new_half_edge.setStartAndEnd(halfedge_["startPoint"], halfedge_["endPoint"])
                halfedges.append(new_half_edge)
            cells.append(Cell(site, halfedges, cell_["closeMe"]))
        for i in range(len(edges_)):
            edge_ = edges_[i]
            edge = Voronoi.buildEdge(edge_)
            edges.append(edge)
        for i in range(len(vertices_)):
            vertex_ = vertices_[i]
            vertex = Voronoi.buildVertex(vertex_)
            vertices.append(vertex)
        diagram = Diagram(cells, edges, vertices, v_["id"])
        diagram.setRelative(relative)
        return diagram, v_["id"]
    @staticmethod
    def readFile(f):
        lines = f.readlines()
        voronois = {}
        for line in lines:
            obj = json.loads(line)
            v, id = Voronoi.decodeObj(obj)
            voronois[id] = v
        return voronois

class Blend:
    @staticmethod
    def buildCell(cell, node, diagram):
        halfedges = cell.halfedges
        vertices = []
        edges = []
        faces = []
        face = []
        point = 0
        id = cell.site.id
        vertex = diagram.relative
        scale = 1
        print("build cell")
        for i in range(len(halfedges)):
            half_edge = halfedges[i]
            edge = half_edge.edge
            vb = half_edge.end
            face.append(point)
            point = point + 1
            if len(vertices) == 0:
                va = half_edge.start
                vertices.append((scale * (va.x + vertex.x), scale * (va.y + vertex.y), 0))
                vertices.append((scale * (vb.x + vertex.x), scale * (vb.y + vertex.y), 0))
                edges.append((0, 1))
            else:
                vertices.append((scale * (vb.x + vertex.x), scale * (vb.y + vertex.y), 0))
                v_index = len(vertices)
                edges.append((v_index - 2, v_index - 1))
        edges.append((v_index - 1, 0))   
        faces.append(tuple(face))
        new_mesh = bpy.data.meshes.new('c_'+str(id))
        new_mesh.from_pydata(vertices, edges, faces)
        new_mesh.update()
        # make object from mesh
        new_object = bpy.data.objects.new('o_'+str(id), new_mesh)
        # make collection
        new_collection = bpy.data.collections.new('nc_'+str(id))
        bpy.context.scene.collection.children.link(new_collection)
        # add object to scene collection
        new_collection.objects.link(new_object)
        bmesh.ops.extrude_discrete_faces(new_mesh, faces, use_normal_flip, use_select_history)
    @staticmethod 
    def buildCity(voronois, nodes):
        # make mesh
        count = 0 
        for n in range(len(nodes)):
            node = nodes[n]
            voronoiId = node.voronoi
            if voronoiId in voronois: 
                diagram = voronois[voronoiId]
                cell = None
                for i in range(len(diagram.cells)):
                    if diagram.cells[i].used == False:
                        cell = diagram.cells[i]
                        cell.used = True
                        break
                if cell != None:
                    count = count + 1
                    Blend.buildCell(cell, node, diagram)
                    if count > 10:
                        break

    @staticmethod
    def execute(node_path, voronoi_path):
        f = open(voronoi_path, "r")
        print("voronoi reading ...")
        voronois = Voronoi.readFile(f)
        
        print("node reading ...")
        g = open(node_path, "r")
        nodes = NodeInfo.readFile(g)

        Blend.buildCity(voronois, nodes)
        

if __name__ == "__main__":
    register()