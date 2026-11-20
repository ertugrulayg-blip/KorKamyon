# Meshy gövdesini oyuna hazırlar: köşeleri birleştir, sadeleştir, dokuyu yeni UV ile yeniden pişir, ölçekle,
# iskelet kur (eklem yerleri bu model için ölçüldü), ağırlıkları kemiğe uzaklıktan ver, GLB aktar.
# Kullanım (Blender Python modülü: pip install bpy): python tools/govde_iskelet.py -- girdi.glb assets/chars/govde.glb yuz=20000 doku=1024
# Meshy'den düşük yüzlü (≤ 1,5 × yuz) gelen model sadeleştirilmez, kendi dokusu kullanılır.
import bpy, sys, math

args = sys.argv[sys.argv.index('--') + 1:]
GIRDI, CIKTI = args[0], args[1]
HEDEF_YUZ = int(dict(a.split("=") for a in args[2:]).get("yuz", 14000)) if len(args) > 2 else 14000
OLCEK = 0.75
BOY_HEDEF = 1.425 # oyundaki gövde boyu (m, ölçek 1)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GIRDI)
govde = [o for o in bpy.data.objects if o.type == 'MESH'][0]
govde.name = 'Govde'
bpy.context.view_layer.objects.active = govde
govde.select_set(True)

# 1) sadeleştir ve dokuyu yeniden pişir: Meshy'nin doku haritası yüzlerce küçük parçadan oluşur; sadeleştirince dikişler
# kayar ve doku çatlak çatlak görünür. Bu yüzden düşük yüzlü kopyaya yeni, düzgün bir doku haritası açılır ve
# yüksek detaylı modelin rengi üstüne pişirilir (Cycles "seçiliden etkine").
DOKU = int(dict(a.split("=") for a in args[2:]).get("doku", 2048)) if len(args) > 2 else 2048
if len(govde.data.polygons) <= HEDEF_YUZ * 1.5:
    # Meshy'den zaten düşük yüzlü geldi (kendi düzgün UV'siyle): sadeleştirme ve pişirme yok. Yalnız renk dokusu kalır,
    # normal ve metal/pürüz haritaları atılır (dosyayı büyütür, bu çizgi film görünüşte farkı az).
    mat = govde.data.materials[0]; nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    for ad in ('Metallic', 'Roughness', 'Normal'):
        for l in list(bsdf.inputs[ad].links): nt.links.remove(l)
    bsdf.inputs['Metallic'].default_value = 0.0; bsdf.inputs['Roughness'].default_value = 0.7
    renk = bsdf.inputs['Base Color'].links[0].from_node.image
    for n in [n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image != renk]: nt.nodes.remove(n)
    if renk.size[0] > DOKU: renk.scale(DOKU, DOKU)
    print('yüz:', len(govde.data.polygons), '(düşük yüzlü geldi) doku', renk.size[:])
else:
    yuksek = govde
    bpy.ops.object.duplicate(); govde = bpy.context.object; govde.name = 'Govde'; yuksek.name = 'Yuksek'
    # Meshy ağı doku parçaları boyunca kopuktur: önce köşeler birleşir, yoksa sadeleştirince parçalar arasında delik açılır
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0002); bpy.ops.object.mode_set(mode='OBJECT')
    print('birleşince köşe:', len(govde.data.vertices))
    mod = govde.modifiers.new('sade', 'DECIMATE'); mod.ratio = HEDEF_YUZ / len(govde.data.polygons); mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print('yüz:', len(govde.data.polygons))
    while govde.data.uv_layers: govde.data.uv_layers.remove(govde.data.uv_layers[0])
    govde.data.uv_layers.new(name='UV')
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004); bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new('govde_renk', DOKU, DOKU)
    mat = bpy.data.materials.new('Govde'); mat.use_nodes = True; nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Metallic'].default_value = 0.0; bsdf.inputs['Roughness'].default_value = 0.7
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; nt.nodes.active = tex
    govde.data.materials.clear(); govde.data.materials.append(mat)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    bk = sc.render.bake; bk.use_pass_direct = False; bk.use_pass_indirect = False; bk.use_pass_color = True
    bk.use_selected_to_active = True; bk.cage_extrusion = 0.02; bk.max_ray_distance = 0.06; bk.margin = 8
    for o in bpy.context.view_layer.objects: o.select_set(False)
    yuksek.select_set(True); govde.select_set(True); bpy.context.view_layer.objects.active = govde
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bpy.data.objects.remove(yuksek, do_unlink=True)
    print('doku pişirildi', DOKU)

# 2) ölçek ve ayaklar yerde (Blender z yukarı)
govde.select_set(True); bpy.context.view_layer.objects.active = govde
# Eklem kalıbı motorcu modelinde (boy 1,90, kol ucu x 0,84) ölçüldü. Başka modelde boyuna ve genişliğine oranlanır.
_vs = [govde.matrix_world @ v.co for v in govde.data.vertices]
_H = max(v.z for v in _vs) - min(v.z for v in _vs); _X = max(abs(v.x) for v in _vs)
OLCEK = BOY_HEDEF / _H; SZ = _H / 1.90; SX = _X / 0.84
print('ham boy', round(_H, 3), 'genişlik', round(_X, 3), 'SX', round(SX, 3))
govde.scale = (OLCEK, OLCEK, OLCEK)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
alt = min(v.co.z for v in govde.data.vertices)
for v in govde.data.vertices: v.co.z -= alt
print('boy:', round(max(v.co.z for v in govde.data.vertices), 3))

# 4) iskelet: eklem yerleri kesitlerden ve görüntülerden ölçüldü (ham ölçü, ayak tabanı 0, boy 1.90). Model -Y'ye bakar; sol +X.
def p(x, y, z): return (x * SX * OLCEK, y * SX * OLCEK, z * SZ * OLCEK)
EKLEM = {
    'Hips': (p(0, 0, 0.48), p(0, 0, 0.62), None),
    'Spine': (p(0, 0, 0.62), p(0, 0, 0.78), 'Hips'),
    'Spine1': (p(0, 0, 0.78), p(0, 0, 0.95), 'Spine'),
    'Spine2': (p(0, 0, 0.95), p(0, 0, 1.12), 'Spine1'),
    'Neck': (p(0, 0, 1.12), p(0, 0, 1.30), 'Spine2'),
    'Head': (p(0, 0, 1.30), p(0, 0, 1.88), 'Neck'),
}
for s, ad in ((1, 'Left'), (-1, 'Right')):
    EKLEM[ad + 'Arm'] = (p(s * 0.36, 0.01, 1.12), p(s * 0.58, 0.02, 0.93), 'Spine2')
    EKLEM[ad + 'ForeArm'] = (p(s * 0.58, 0.02, 0.93), p(s * 0.72, 0.02, 0.78), ad + 'Arm')
    EKLEM[ad + 'Hand'] = (p(s * 0.72, 0.02, 0.78), p(s * 0.80, 0.02, 0.60), ad + 'ForeArm')
    EKLEM[ad + 'UpLeg'] = (p(s * 0.18, 0.0, 0.48), p(s * 0.26, 0.0, 0.27), 'Hips')
    EKLEM[ad + 'Leg'] = (p(s * 0.26, 0.0, 0.27), p(s * 0.30, 0.0, 0.12), ad + 'UpLeg')
    EKLEM[ad + 'Foot'] = (p(s * 0.30, 0.0, 0.12), p(s * 0.32, -0.28, 0.03), ad + 'Leg')
bpy.ops.object.armature_add(location=(0, 0, 0)); arm = bpy.context.object; arm.name = 'Armature'
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones; eb.remove(eb[0])
for ad, (bas, uc, ata) in EKLEM.items():
    b = eb.new(ad); b.head = bas; b.tail = uc
for ad, (bas, uc, ata) in EKLEM.items():
    if ata: eb[ad].parent = eb[ata]; eb[ad].use_connect = False
# kollar ve bacaklar için roll: kemiğin +Z'si yukarı/ileri baksın (IK yönlerinden bağımsız ama düzenli olsun)
bpy.ops.armature.select_all(action='SELECT'); bpy.ops.armature.calculate_roll(type='GLOBAL_POS_Z')
bpy.ops.object.mode_set(mode='OBJECT')

# 5) ağırlık: her köşe en yakın kemik parçalarına (uzaklığın 4. kuvvetiyle ters orantılı, en çok 3 kemik).
# Kurallar: sol uzuv köşeleri sağ uzva bağlanmaz (ve tersi); boynun üstü yalnız kafa/boyun; bilek altı el, ayak bileği altı ayak.
govde.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_NAME')
from mathutils import Vector
from mathutils.geometry import intersect_point_line
kemik = {b.name: (Vector(b.head_local), Vector(b.tail_local)) for b in arm.data.bones}
gruplar = {ad: govde.vertex_groups.get(ad) or govde.vertex_groups.new(name=ad) for ad in kemik}
BOYUN_UST = 1.28 * SZ * OLCEK
KOL_ALT, GOVDE_YARI, EL_ALT, OMUZ_IC = 1.0 * SZ * OLCEK, 0.5 * SX * OLCEK, 0.5 * SZ * OLCEK, 0.36 * SX * OLCEK # omuz ekleminin içi; ham ölçü: omuz altı yükseklik, gövdenin yarı genişliği, ellerin altı (kesitlerden)
def uzak(v, ad):
    a, b = kemik[ad]; q, t = intersect_point_line(v, a, b); t = max(0.0, min(1.0, t))
    return (v - (a + (b - a) * t)).length
for vx in govde.data.vertices:
    v = vx.co
    if v.z > BOYUN_UST: adaylar = ['Head', 'Neck'] if v.z < BOYUN_UST + 0.06 else ['Head']
    else:
        adaylar = [ad for ad in kemik if not ((ad.startswith('Left') and v.x < -0.03) or (ad.startswith('Right') and v.x > 0.03))]
        adaylar = [ad for ad in adaylar if ad != 'Head']
        # Omuz hizasının altında kollar gövdeden ayrık sarkar (A duruşu): gövde genişliğinin içindekiler (ceket, bel, kalça)
        # kol kemiğine bağlanmaz, dışındakiler (kol, el) yalnız kol kemiklerine. Yoksa kol kalkınca belin yanı uzar.
        if v.z < KOL_ALT:
            kolda = abs(v.x) > GOVDE_YARI and v.z > EL_ALT # ellerin altı (bacaklar, botların dış kenarı) hiç kola bağlanmaz
            adaylar = [ad for ad in adaylar if (('Arm' in ad or 'Hand' in ad) == kolda)]
        elif abs(v.x) < OMUZ_IC: # omuz bandında göğsün ve sırtın ortası kola bağlanmaz (kol kalkınca göğüs çekilmesin)
            adaylar = [ad for ad in adaylar if not ('Arm' in ad or 'Hand' in ad)]
    d = sorted((uzak(v, ad), ad) for ad in adaylar)[:3]
    w = [(1.0 / (x + 0.015) ** 4, ad) for x, ad in d]; top = sum(x for x, _ in w)
    for x, ad in w:
        if x / top > 0.03: gruplar[ad].add([vx.index], x / top, 'REPLACE')
agirliksiz = sum(1 for v in govde.data.vertices if not v.groups)
print('grup:', len(govde.vertex_groups), 'ağırlıksız köşe:', agirliksiz)

# 6) aktar
bpy.ops.export_scene.gltf(filepath=CIKTI, export_format='GLB', export_skins=True, export_animations=False, export_image_format='JPEG', export_jpeg_quality=85, export_yup=True)
print('yazıldı:', CIKTI)
