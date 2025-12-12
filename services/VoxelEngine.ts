
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { ShapeSpec, LabelSpec, AngleSpec, DimensionSpec } from '../types';
import { COLORS, CONFIG } from '../utils/voxelConstants';

// --- Internal Camera Controller (Mobile Friendly) ---
class SimpleOrbitControls {
    private camera: THREE.Camera;
    private domElement: HTMLElement;
    private isDragging = false;
    private previousMousePosition = { x: 0, y: 0 };
    private spherical = new THREE.Spherical();
    private target = new THREE.Vector3(0, 5, 0);
    public autoRotate = false;
    private lastPinchDist = 0;

    constructor(camera: THREE.Camera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
        this.spherical.setFromVector3(offset);

        this.domElement.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
        this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });

        this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.domElement.addEventListener('touchend', this.onTouchEnd);
    }

    private onMouseDown = (e: MouseEvent) => {
        if (e.button === 0) {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
            this.domElement.style.cursor = 'grabbing';
        }
    }

    private onMouseMove = (e: MouseEvent) => {
        if (this.isDragging) {
            const deltaMove = {
                x: e.clientX - this.previousMousePosition.x,
                y: e.clientY - this.previousMousePosition.y
            };
            this.rotate(deltaMove.x, deltaMove.y);
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    }

    private onMouseUp = () => {
        this.isDragging = false;
        this.domElement.style.cursor = 'crosshair';
    }

    private onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            this.isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.lastPinchDist = Math.sqrt(dx*dx + dy*dy);
        }
    }

    private onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1 && this.isDragging) {
            const deltaMove = {
                x: e.touches[0].clientX - this.previousMousePosition.x,
                y: e.touches[0].clientY - this.previousMousePosition.y
            };
            this.rotate(deltaMove.x, deltaMove.y);
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const delta = this.lastPinchDist - dist;
            this.zoom(delta * 0.1);
            this.lastPinchDist = dist;
        }
    }

    private onTouchEnd = () => {
        this.isDragging = false;
        this.lastPinchDist = 0;
    }

    private rotate(dx: number, dy: number) {
        const rotateSpeed = 0.008;
        this.spherical.theta -= dx * rotateSpeed;
        this.spherical.phi -= dy * rotateSpeed;
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    }

    private zoom(delta: number) {
        this.spherical.radius += delta;
        this.spherical.radius = Math.max(5, Math.min(80, this.spherical.radius));
    }

    private onMouseWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomSpeed = 0.05;
        this.zoom(e.deltaY * zoomSpeed);
    }

    public update() {
        if (this.autoRotate && !this.isDragging) {
            this.spherical.theta += 0.002;
        }
        const offset = new THREE.Vector3().setFromSpherical(this.spherical);
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
    }
    
    public dispose() {
        this.domElement.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        this.domElement.removeEventListener('wheel', this.onMouseWheel);
        this.domElement.removeEventListener('touchstart', this.onTouchStart);
        this.domElement.removeEventListener('touchmove', this.onTouchMove);
        this.domElement.removeEventListener('touchend', this.onTouchEnd);
    }
}

export class GeometryEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: SimpleOrbitControls;
  
  private shapes: THREE.Group = new THREE.Group();
  private labelsGroup: THREE.Group = new THREE.Group();
  private dimensionsGroup: THREE.Group = new THREE.Group();
  private anglesGroup: THREE.Group = new THREE.Group();
  private measureLineGroup: THREE.Group = new THREE.Group();
  private previewLineGroup: THREE.Group = new THREE.Group();
  private snapMarkersGroup: THREE.Group = new THREE.Group(); 
  
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private mouseDownPos = new THREE.Vector2();
  
  private isMeasuring = false;
  private measureState: 0 | 1 | 2 = 0; 
  
  private snapPoints: { position: THREE.Vector3, type: string }[] = [];
  private activeSnapPoint: THREE.Vector3 | null = null;
  private measureStart: THREE.Vector3 | null = null;
  private highlightMesh: THREE.Mesh;
  
  private onMeasureChange: (distance: number | null) => void;
  private animationId: number = 0;
  private snowParticles: THREE.Points | null = null;

  constructor(container: HTMLElement, onMeasureChange: (d: number | null) => void) {
    this.container = container;
    this.onMeasureChange = onMeasureChange;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.FogExp2(COLORS.background, 0.015);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(24, 24, 24); 

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new SimpleOrbitControls(this.camera, this.renderer.domElement);

    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffea00, 1.2);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    this.scene.add(dir);

    this.scene.add(this.shapes, this.labelsGroup, this.dimensionsGroup, this.anglesGroup, this.measureLineGroup, this.previewLineGroup, this.snapMarkersGroup);

    const grid = new THREE.GridHelper(50, 50, COLORS.gridPrimary, COLORS.gridSecondary);
    grid.position.y = CONFIG.FLOOR_Y;
    this.scene.add(grid);

    this.setupSnow();

    // Snap Highlight - Larger for visibility
    this.highlightMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.6), 
        new THREE.MeshBasicMaterial({ color: 0xff1493, depthTest: false, transparent: true, opacity: 0.8 })
    );
    this.highlightMesh.visible = false;
    this.highlightMesh.renderOrder = 9999; // Ensure on top
    this.scene.add(this.highlightMesh);

    // Interaction Listeners
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointerup', this.onPointerUp);
    this.container.addEventListener('pointermove', this.onPointerMove);
    this.container.addEventListener('touchstart', this.onTouchMove, { passive: false }); 
    
    this.animate();
  }

  // --- Rendering Loop ---
  private animate = () => {
      this.animationId = requestAnimationFrame(this.animate);
      this.controls.update();
      this.updateSnow();
      this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
  }

  public cleanup() {
      cancelAnimationFrame(this.animationId);
      this.controls.dispose();
      this.container.removeEventListener('pointerdown', this.onPointerDown);
      this.container.removeEventListener('pointerup', this.onPointerUp);
      this.container.removeEventListener('pointermove', this.onPointerMove);
      this.renderer.dispose();
  }

  // --- Snow Effect ---
  private setupSnow() {
      const geo = new THREE.BufferGeometry();
      const count = 1500;
      const pos = new Float32Array(count * 3);
      for(let i=0; i<count*3; i++) {
          pos[i] = (Math.random() - 0.5) * 100;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
          color: COLORS.snow,
          size: 0.3,
          transparent: true,
          opacity: 0.8
      });
      this.snowParticles = new THREE.Points(geo, mat);
      this.scene.add(this.snowParticles);
  }

  private updateSnow() {
      if(!this.snowParticles) return;
      const positions = this.snowParticles.geometry.attributes.position.array as Float32Array;
      for(let i=1; i<positions.length; i+=3) {
          positions[i] -= 0.05;
          if (positions[i] < -10) positions[i] = 40;
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
  }

  // --- Scene Loading ---
  public loadScene(shapes: ShapeSpec[], labels: LabelSpec[], angles: AngleSpec[], dimensions: DimensionSpec[]) {
      this.shapes.clear();
      this.labelsGroup.clear();
      this.dimensionsGroup.clear();
      this.anglesGroup.clear();
      this.resetMeasurement();
      this.snapMarkersGroup.clear();
      this.snapPoints = [];

      shapes.forEach(spec => {
          const mesh = this.createShapeMesh(spec);
          this.shapes.add(mesh);
          this.generateSnapPoints(spec);
      });

      labels.forEach(l => this.createLabel(l));
      dimensions.forEach(d => this.createDimension(d));
      angles.forEach(a => this.createAngle(a));
      
      if (this.isMeasuring) {
          this.showSnapMarkers();
      }
  }

  // --- Mesh Generation ---
  private createShapeMesh(spec: ShapeSpec): THREE.Group {
      const group = new THREE.Group();
      group.position.set(spec.position.x, spec.position.y, spec.position.z);
      group.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z);
      
      let geo: THREE.BufferGeometry;
      if (spec.type === 'cylinder') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 32);
      else if (spec.type === 'cone') geo = new THREE.ConeGeometry(spec.dims.radius, spec.dims.height, 32);
      else if (spec.type === 'sphere') geo = new THREE.SphereGeometry(spec.dims.radius, 32, 32);
      else if (spec.type === 'pyramid') geo = new THREE.CylinderGeometry(0, spec.dims.radius, spec.dims.height, 4);
      else if (spec.type === 'hemisphere') geo = new THREE.SphereGeometry(spec.dims.radius, 32, 16, 0, Math.PI*2, 0, Math.PI/2);
      else if (spec.type === 'tri_prism') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 3);
      else if (spec.type === 'hex_prism') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 6);
      else geo = new THREE.BoxGeometry(spec.dims.width, spec.dims.height, spec.dims.depth);

      const mat = new THREE.MeshStandardMaterial({ 
          color: spec.color, 
          roughness: 0.7,
          metalness: 0.1,
          transparent: true, 
          opacity: 0.9,
          side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: COLORS.shapeLine, linewidth: 2 })
      );
      
      group.add(mesh, edges);
      return group;
  }
  
  // --- Snapping ---
  private generateSnapPoints(spec: ShapeSpec) {
      const dummy = new THREE.Object3D();
      dummy.position.set(spec.position.x, spec.position.y, spec.position.z);
      dummy.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z);
      dummy.updateMatrix();

      const addPoint = (localVec: THREE.Vector3, type: string) => {
          const worldPos = localVec.clone().applyMatrix4(dummy.matrix);
          this.snapPoints.push({ position: worldPos, type });
      };

      addPoint(new THREE.Vector3(0,0,0), 'center');
      
      if (spec.dims.height) {
          const h = spec.dims.height;
          addPoint(new THREE.Vector3(0, h/2, 0), 'center_top');
          addPoint(new THREE.Vector3(0, -h/2, 0), 'center_bottom');
      }

      if (spec.dims.width && spec.dims.height && spec.dims.depth) { 
          const w = spec.dims.width/2; 
          const h = spec.dims.height/2; 
          const d = spec.dims.depth/2;
          
          [w, -w].forEach(x => {
              [h, -h].forEach(y => {
                  [d, -d].forEach(z => {
                      addPoint(new THREE.Vector3(x, y, z), 'vertex');
                  });
              });
          });
      }
      
      if (spec.dims.radius) {
          const r = spec.dims.radius;
          const h = spec.dims.height ? spec.dims.height/2 : 0;
          
          if (['cylinder','cone','pyramid','frustum','tri_prism','hex_prism'].includes(spec.type)) {
               [[r, -h, 0], [-r, -h, 0], [0, -h, r], [0, -h, -r]].forEach(p => addPoint(new THREE.Vector3(p[0], p[1], p[2]), 'rim'));
               if (['cylinder','hex_prism','tri_prism'].includes(spec.type)) {
                   [[r, h, 0], [-r, h, 0], [0, h, r], [0, h, -r]].forEach(p => addPoint(new THREE.Vector3(p[0], p[1], p[2]), 'rim'));
               }
          }
          
          if (['sphere','hemisphere'].includes(spec.type)) {
              [[r,0,0], [-r,0,0], [0,r,0], [0,-r,0], [0,0,r], [0,0,-r]].forEach(p => addPoint(new THREE.Vector3(p[0], p[1], p[2]), 'surface'));
          }
      }
  }

  public setMeasuringMode(active: boolean) {
      this.isMeasuring = active;
      if (active) {
          this.showSnapMarkers();
      } else {
          this.resetMeasurement();
          this.snapMarkersGroup.clear();
      }
  }
  
  private resetMeasurement() {
      this.measureState = 0;
      this.measureStart = null;
      this.activeSnapPoint = null;
      this.highlightMesh.visible = false;
      this.measureLineGroup.clear();
      this.previewLineGroup.clear();
      this.onMeasureChange(null);
  }
  
  private showSnapMarkers() {
      this.snapMarkersGroup.clear();
      const dotGeo = new THREE.SphereGeometry(0.35); // Larger size
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, depthTest: false, transparent: true, opacity: 0.8 }); // Higher opacity
      
      this.snapPoints.forEach(pt => {
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.position.copy(pt.position);
          this.snapMarkersGroup.add(dot);
      });
  }
  
  public setAutoRotate(active: boolean) {
      this.controls.autoRotate = active;
  }

  private onPointerMove = (e: MouseEvent) => {
      this.updateMouse(e.clientX, e.clientY);
      this.handleHoverInteraction();
  }
  
  private onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
          this.updateMouse(e.touches[0].clientX, e.touches[0].clientY - 50);
          this.handleHoverInteraction();
      }
  }

  private updateMouse(x: number, y: number) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
  }

  private handleHoverInteraction() {
      if (!this.isMeasuring) return;

      this.activeSnapPoint = null;
      this.highlightMesh.visible = false;
      this.renderer.domElement.style.cursor = 'default';

      // Magnetic Snapping with Priority
      const SNAP_THRESHOLD_SQ = 0.012; // Tuned for better balance (~10% screen width range)
      const candidates: { distSq: number; point: THREE.Vector3; priority: number }[] = [];

      for (const pt of this.snapPoints) {
          const tempV = pt.position.clone();
          tempV.project(this.camera);
          
          if (tempV.z > 1 || tempV.z < -1) continue;
          
          const dx = tempV.x - this.mouse.x;
          const dy = tempV.y - this.mouse.y;
          const dSq = dx*dx + dy*dy;
          
          if (dSq < SNAP_THRESHOLD_SQ) {
              // Priority System:
              // 2: Structural Centers (Height/Width definers)
              // 2: Vertices (Sharp corners)
              // 1: Center (Volumetric center)
              // 0: Rims/Surface points
              let priority = 0;
              if (['center_top', 'center_bottom', 'vertex'].includes(pt.type)) priority = 2;
              else if (pt.type === 'center') priority = 1;
              
              candidates.push({ distSq: dSq, point: pt.position, priority });
          }
      }

      let targetPoint: THREE.Vector3 | null = null;

      if (candidates.length > 0) {
          // Sort: Higher priority first, then closer distance
          candidates.sort((a, b) => {
              if (b.priority !== a.priority) return b.priority - a.priority;
              return a.distSq - b.distSq;
          });
          
          this.activeSnapPoint = candidates[0].point;
          targetPoint = this.activeSnapPoint;
          this.highlightMesh.position.copy(targetPoint);
          this.highlightMesh.visible = true;
          this.renderer.domElement.style.cursor = 'pointer';
      } else {
           // Fallback: Raycast Surface
           this.raycaster.setFromCamera(this.mouse, this.camera);
           const surfaceIntersects = this.raycaster.intersectObjects(this.shapes.children, true);
           if (surfaceIntersects.length > 0) {
               targetPoint = surfaceIntersects[0].point;
           }
      }

      // Update Preview Line
      this.previewLineGroup.clear();
      if (this.measureState === 1 && this.measureStart && targetPoint) {
          const geo = new THREE.BufferGeometry().setFromPoints([this.measureStart, targetPoint]);
          const mat = new THREE.LineBasicMaterial({ color: 0xff1493, depthTest: false, linewidth: 2 });
          const line = new THREE.Line(geo, mat);
          this.previewLineGroup.add(line);
      }
  }

  private onPointerDown = (e: MouseEvent) => {
      this.mouseDownPos.set(e.clientX, e.clientY);
  }

  private onPointerUp = (e: MouseEvent) => {
      if (!this.isMeasuring) return;

      const dist = new THREE.Vector2(e.clientX, e.clientY).distanceTo(this.mouseDownPos);
      if (dist > 15) return;
      
      // LOGIC FOR CLICK (Setting Points)
      if (this.activeSnapPoint) {
          if (this.measureState === 0 || this.measureState === 2) {
              // START
              this.measureLineGroup.clear();
              this.measureStart = this.activeSnapPoint.clone();
              this.measureState = 1;
              
              const startMarker = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 0xff1493, depthTest: false}));
              startMarker.position.copy(this.measureStart);
              this.measureLineGroup.add(startMarker);
              
              this.onMeasureChange(null);
              
          } else if (this.measureState === 1) {
              // FINISH
              const end = this.activeSnapPoint.clone();
              const dist3d = this.measureStart!.distanceTo(end);
              
              this.previewLineGroup.clear();
              
              const path = new THREE.LineCurve3(this.measureStart!, end);
              const tube = new THREE.TubeGeometry(path, 1, 0.15, 8, false);
              const mesh = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: 0xff1493, depthTest: false }));
              
              const endMarker = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 0xff1493, depthTest: false}));
              endMarker.position.copy(end);
              
              this.measureLineGroup.add(mesh, endMarker);
              
              const mid = this.measureStart!.clone().lerp(end, 0.5);
              mid.y += 0.5;
              this.createLabel({ 
                  text: `${dist3d.toFixed(2)}`, 
                  position: mid, 
                  color: '#ff1493' 
              });
              
              this.onMeasureChange(dist3d);
              this.measureStart = null;
              this.measureState = 2;
          }
      } else {
          if (this.measureState === 2) {
              this.resetMeasurement();
              this.showSnapMarkers();
          }
      }
  }

  // --- Visual Helpers ---
  private createLabel(spec: LabelSpec) { 
      const c = document.createElement('canvas'); const ctx = c.getContext('2d'); if(!ctx) return; c.width=256;c.height=128; ctx.fillStyle=spec.color||'#ffffff'; ctx.font='bold 40px Arial'; ctx.textAlign='center'; const p = spec.text.split('_'); ctx.fillText(p[0], 128, 64); if(p[1]) { ctx.font='bold 28px Arial'; ctx.fillText(p[1], 128+ctx.measureText(p[0]).width/2+10, 84); } 
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); 
      s.position.set(spec.position.x, spec.position.y, spec.position.z); 
      s.scale.set(4, 2, 1); 
      s.renderOrder = 999; 
      
      if (spec.color === '#ff1493') {
          this.measureLineGroup.add(s);
      } else {
          this.labelsGroup.add(s); 
      }
  }
  
  private createDimension(spec: DimensionSpec) { const s = new THREE.Vector3(spec.start.x, spec.start.y, spec.start.z), e = new THREE.Vector3(spec.end.x, spec.end.y, spec.end.z), o = new THREE.Vector3(spec.offset.x, spec.offset.y, spec.offset.z); const p1 = s.clone().add(o), p2 = e.clone().add(o); this.dimensionsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false })), new THREE.Line(new THREE.BufferGeometry().setFromPoints([s, p1]), new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent:true, opacity:0.5, depthTest:false })), new THREE.Line(new THREE.BufferGeometry().setFromPoints([e, p2]), new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent:true, opacity:0.5, depthTest:false }))); const mid = p1.clone().lerp(p2, 0.5).add(o.clone().normalize().multiplyScalar(0.5)); this.createLabel({ text: spec.text, position: {x:mid.x, y:mid.y, z:mid.z} }); }
  private createAngle(spec: AngleSpec) { const o = new THREE.Vector3(spec.origin.x, spec.origin.y, spec.origin.z), dA = new THREE.Vector3(spec.vecA.x, spec.vecA.y, spec.vecA.z).normalize(), dB = new THREE.Vector3(spec.vecB.x, spec.vecB.y, spec.vecB.z).normalize(), l = 1.5; if(dA.distanceTo(dB)<0.001)return; const m = new THREE.LineBasicMaterial({ color: 0xfacc15, depthTest: false }); this.anglesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([o, o.clone().add(dA.clone().multiplyScalar(l*1.5))]), m), new THREE.Line(new THREE.BufferGeometry().setFromPoints([o, o.clone().add(dB.clone().multiplyScalar(l*1.5))]), m)); const pA = o.clone().add(dA.clone().multiplyScalar(l)), pB = o.clone().add(dB.clone().multiplyScalar(l)); const cl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pA, pB]), new THREE.LineDashedMaterial({ color: 0xfacc15, dashSize:0.2, gapSize:0.1, depthTest:false })); cl.computeLineDistances(); this.anglesGroup.add(cl); const pos = o.clone().add(dA.clone().add(dB).normalize().multiplyScalar(l * 1.2)); this.createLabel({ text: spec.text || 'θ', position: {x:pos.x, y:pos.y, z:pos.z}, color: '#facc15' }); }
}
