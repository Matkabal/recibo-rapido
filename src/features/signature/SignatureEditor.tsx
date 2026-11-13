import Cropper, { type Area } from 'react-easy-crop'
import { Camera, Check, Eraser, ImagePlus, PenLine, RotateCw, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '../../components/ui'
import { db } from '../../db/database'

export function SignatureEditor({ onClose, onSaved, notify }: { onClose: () => void; onSaved: () => void; notify: (message: string, type?: 'success' | 'error') => void }) {
  const [mode, setMode] = useState<'draw' | 'import'>('draw')
  return <Modal title="Minha assinatura" onClose={onClose} wide><div className="signature-guide"><strong>Vire o celular na horizontal</strong> para ter mais espaço para assinar. Se preferir, você também pode continuar na posição atual.</div><div className="button-row" style={{marginTop:0,marginBottom:14}}><Button variant={mode === 'draw' ? 'primary' : 'secondary'} onClick={() => setMode('draw')}><PenLine size={18}/>Desenhar</Button><Button variant={mode === 'import' ? 'primary' : 'secondary'} onClick={() => setMode('import')}><ImagePlus size={18}/>Importar imagem</Button></div>{mode === 'draw' ? <DrawSignature onClose={onClose} onSaved={onSaved} notify={notify}/> : <ImportSignature onClose={onClose} onSaved={onSaved} notify={notify}/>}</Modal>
}

function DrawSignature({ onClose, onSaved, notify }: { onClose: () => void; onSaved: () => void; notify: (message: string, type?: 'success' | 'error') => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef({x:0,y:0})
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const existing = hasInk ? canvas.toDataURL() : null
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(600, Math.round(rect.width * 2))
      canvas.height = Math.max(300, Math.round(rect.height * 2))
      if (existing) {
        const image = new Image(); image.onload = () => canvas.getContext('2d')?.drawImage(image,0,0,canvas.width,canvas.height); image.src = existing
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return { x:(event.clientX-rect.left)*(canvas.width/rect.width), y:(event.clientY-rect.top)*(canvas.height/rect.height) }
  }
  const down = (event: React.PointerEvent<HTMLCanvasElement>) => { event.currentTarget.setPointerCapture(event.pointerId); drawing.current=true; last.current=point(event) }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const next = point(event); const context=event.currentTarget.getContext('2d'); if(!context)return
    context.beginPath(); context.moveTo(last.current.x,last.current.y); context.lineTo(next.x,next.y); context.strokeStyle='#0f2747'; context.lineWidth=Math.max(4,event.pressure?event.pressure*8:5); context.lineCap='round'; context.lineJoin='round'; context.stroke(); last.current=next; setHasInk(true)
  }
  const stop = () => { drawing.current=false }
  const clear = () => { const canvas=canvasRef.current; if(canvas) canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height); setHasInk(false) }
  const rotate = async () => { try { await (screen.orientation as ScreenOrientation & {lock:(orientation:string)=>Promise<void>}).lock('landscape'); } catch { notify('O navegador não permitiu girar automaticamente. Você pode virar o celular manualmente.') } }
  const save = async () => {
    const canvas=canvasRef.current
    if(!canvas || !hasInk) return notify('Desenhe sua assinatura antes de confirmar.', 'error')
    const blob=await new Promise<Blob|null>((resolve)=>canvas.toBlob(resolve,'image/png'))
    if(!blob) return notify('Não foi possível salvar a assinatura.', 'error')
    await db.signatures.put({id:'current',blob,width:canvas.width,height:canvas.height,updatedAt:new Date().toISOString()})
    notify('Assinatura salva no celular.', 'success'); onSaved()
  }
  return <><Button type="button" variant="secondary" className="orientation-button" onClick={() => void rotate()}><Smartphone size={18}/>Tentar modo horizontal</Button><canvas ref={canvasRef} className="signature-canvas" aria-label="Área para desenhar assinatura" onPointerDown={down} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}/><div className="signature-tools"><Button variant="danger" onClick={clear}><Eraser size={18}/>Apagar tudo</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => void save()}><Check size={18}/>OK</Button></div></>
}

function ImportSignature({ onClose, onSaved, notify }: { onClose: () => void; onSaved: () => void; notify: (message: string, type?: 'success' | 'error') => void }) {
  const [source, setSource] = useState('')
  const [crop, setCrop] = useState({x:0,y:0})
  const [zoom,setZoom]=useState(1)
  const [rotation,setRotation]=useState(0)
  const [area,setArea]=useState<Area|null>(null)
  const [removeWhite,setRemoveWhite]=useState(true)
  const [preview,setPreview]=useState<{blob:Blob;url:string;width:number;height:number}|null>(null)
  useEffect(()=>()=>{if(source)URL.revokeObjectURL(source)},[source])
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url)},[preview?.url])
  const choose=(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];if(!file)return;if(file.size>20*1024*1024)return notify('Escolha uma imagem com até 20 MB.','error');setPreview(null);setSource(URL.createObjectURL(file))}
  const process=async()=>{if(!source||!area)return;try{const result=await cropImage(source,area,rotation,removeWhite);setPreview({...result,url:URL.createObjectURL(result.blob)})}catch{notify('Não foi possível preparar essa imagem.','error')}}
  const save=async()=>{if(!preview)return;await db.signatures.put({id:'current',blob:preview.blob,width:preview.width,height:preview.height,updatedAt:new Date().toISOString()});notify('Assinatura importada e salva.','success');onSaved()}
  if(preview)return <><div className="signature-preview" style={{height:190}}><img src={preview.url} alt="Prévia da assinatura importada"/></div><p className="subtitle" style={{textAlign:'center'}}>Confira o resultado antes de salvar.</p><div className="button-row"><Button variant="secondary" onClick={()=>setPreview(null)}>Voltar e ajustar</Button><Button onClick={()=>void save()}><Check size={18}/>Salvar assinatura</Button></div></>
  return <>{!source ? <div className="empty-state"><div className="empty-icon"><Camera/></div><h3>Foto ou imagem</h3><p>Escolha uma imagem da galeria ou fotografe uma assinatura feita em papel.</p><label className="button button-primary" htmlFor="signature-file"><ImagePlus size={18}/>Escolher imagem</label><input id="signature-file" type="file" accept="image/*" capture="environment" onChange={choose} hidden/><div className="button-row"><Button variant="secondary" onClick={onClose}>Cancelar</Button></div></div> : <><div className="import-stage"><Cropper image={source} crop={crop} zoom={zoom} rotation={rotation} aspect={3} onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={(_area, pixels)=>setArea(pixels)} /></div><label className="slider-row"><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event)=>setZoom(Number(event.target.value))}/></label><label className="slider-row"><span>Girar</span><input type="range" min="-180" max="180" step="1" value={rotation} onChange={(event)=>setRotation(Number(event.target.value))}/></label><label className="confirm-box"><input type="checkbox" checked={removeWhite} onChange={(event)=>setRemoveWhite(event.target.checked)}/><span>Remover o fundo branco, quando possível</span></label><div className="crop-actions"><Button variant="secondary" onClick={()=>setRotation((value)=>value+90)}><RotateCw size={18}/>Girar 90°</Button><label className="button button-secondary" htmlFor="signature-file-change">Trocar imagem</label><input id="signature-file-change" type="file" accept="image/*" onChange={choose} hidden/></div><div className="button-row"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={()=>void process()}>Visualizar resultado</Button></div></>}</>
}

async function cropImage(src:string,area:Area,rotation:number,removeWhite:boolean):Promise<{blob:Blob;width:number;height:number}>{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const item=new Image();item.onload=()=>resolve(item);item.onerror=reject;item.src=src})
  const radians=rotation*Math.PI/180
  const boundW=Math.abs(Math.cos(radians)*image.width)+Math.abs(Math.sin(radians)*image.height)
  const boundH=Math.abs(Math.sin(radians)*image.width)+Math.abs(Math.cos(radians)*image.height)
  const stage=document.createElement('canvas');stage.width=boundW;stage.height=boundH
  const ctx=stage.getContext('2d',{willReadFrequently:true})!;ctx.translate(boundW/2,boundH/2);ctx.rotate(radians);ctx.drawImage(image,-image.width/2,-image.height/2)
  const output=document.createElement('canvas');const scale=Math.min(1,1200/area.width);output.width=Math.max(1,Math.round(area.width*scale));output.height=Math.max(1,Math.round(area.height*scale));const out=output.getContext('2d',{willReadFrequently:true})!;out.drawImage(stage,area.x,area.y,area.width,area.height,0,0,output.width,output.height)
  if(removeWhite){const pixels=out.getImageData(0,0,output.width,output.height);for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];const min=Math.min(r,g,b);if(min>205){const alpha=Math.max(0,255-(min-205)*5.1);pixels.data[i+3]=Math.min(pixels.data[i+3],alpha)}}out.putImageData(pixels,0,0)}
  const blob=await new Promise<Blob|null>((resolve)=>output.toBlob(resolve,'image/png'));if(!blob)throw new Error('Falha ao criar imagem');return{blob,width:output.width,height:output.height}
}
