import React, { useRef, useState } from 'react';
import { User, Car, Activity, Wrench, Share2, ArrowLeft, Loader2, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptPreviewProps {
    data: any;
    onBack: () => void;
}

export function ReceiptPreview({ data, onBack }: ReceiptPreviewProps) {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);

    // Pre-process variables
    const cliente = data.cliente || '';
    const telefone = data.telefone || '';
    const veiculo = data.veiculo || '';
    const placa = data.placa || '';
    const status = data.status || '';
    const servico = data.servico || '';
    const valor = data.valor !== '0.00' ? `R$ ${data.valor.replace('.', ',')}` : 'Avaliação';

    // Format date
    let dataStr = '';
    if (data.data && typeof data.data.toLocaleDateString === 'function') {
        dataStr = data.data.toLocaleDateString('pt-BR');
    } else {
        const today = new Date();
        dataStr = today.toLocaleDateString('pt-BR');
    }

    // Pre-process Whatsapp message
    let msgWhatsapp = `*Informativo TERMEP*\n`;
    if (data.valor !== '0.00') msgWhatsapp += `*${valor}*\n`;
    else msgWhatsapp += `*Status do Serviço*\n`;
    msgWhatsapp += `_Acompanhamento do seu equipamento_\n\n`;
    msgWhatsapp += `👤 *Cliente*\n${cliente}\n\n`;
    msgWhatsapp += `🚜 *Equipamento*\n${veiculo} - ${placa}\n\n`;
    msgWhatsapp += `📊 *Status Atual*\n${status}\n_${dataStr}_\n\n`;
    msgWhatsapp += `🔧 *Serviço Realizado*\n${servico}\n`;

    if (data.fotos && data.fotos.length > 0) {
        msgWhatsapp += `\n📸 *Fotos do Serviço*\n${data.fotos.join('\n')}`;
    }

    const handleShare = async () => {
        if (!receiptRef.current) return;
        setIsSharing(true);

        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Falha ao gerar blob da imagem.");
                const file = new File([blob], 'status_servico.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: 'Status do Serviço',
                            text: msgWhatsapp,
                            files: [file]
                        });
                    } catch (err) {
                        console.log('Compartilhamento nativo falhou ou foi cancelado', err);
                        fallbackWhatsApp();
                    }
                } else {
                    fallbackWhatsApp();

                    // Optional download for desktop
                    const link = document.createElement('a');
                    link.download = `TERMEP_${cliente.replace(/\s+/g, '')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
                setIsSharing(false);
            }, 'image/png');

        } catch (error) {
            console.error("Erro ao gerar imagem:", error);
            fallbackWhatsApp();
            setIsSharing(false);
        }
    };

    const fallbackWhatsApp = () => {
        const cleanPhone = telefone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const urlWhatsapp = `https://wa.me/${finalPhone}?text=${encodeURIComponent(msgWhatsapp)}`;
        window.open(urlWhatsapp, '_blank');
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">

            {/* Target for html2canvas */}
            <div
                ref={receiptRef}
                className="bg-card rounded-[2rem] overflow-hidden shadow-2xl shadow-brand/10 border border-gray-100 relative"
            >
                {/* Header Ribbon */}
                <div className="bg-brand px-8 pt-10 pb-12 text-center text-white relative flex flex-col items-center">
                    {/* Soft decorative glow */}
                    <div className="absolute top-0 left-1/2 -top-1/2 -translate-x-1/2 w-3/4 h-full bg-brand-light/40 blur-3xl rounded-full" />

                    <h2 className="text-sm font-medium tracking-widest uppercase opacity-80 mb-2 relative z-10">Informativo TERMEP</h2>
                    <div className="text-5xl font-extrabold tracking-tight mb-3 relative z-10">{valor}</div>
                    <div className="inline-flex items-center px-3 py-1 bg-white/15 rounded-full text-sm font-medium relative z-10">
                        {status}
                    </div>
                </div>

                {/* Data Body */}
                <div className="p-8 space-y-8 bg-white relative">

                    {/* Faux cut-out effect on sides */}
                    <div className="absolute -top-4 -left-4 w-8 h-8 bg-bg-light rounded-full shadow-inner" />
                    <div className="absolute -top-4 -right-4 w-8 h-8 bg-bg-light rounded-full shadow-inner" />

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-brand flex items-center justify-center shrink-0 border border-gray-100">
                                <User size={22} className="opacity-80" />
                            </div>
                            <div>
                                <div className="text-gray-400 text-sm font-medium mb-1 tracking-wide">CLIENTE</div>
                                <div className="text-xl font-bold text-gray-800">{cliente}</div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gray-100/80" />

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-brand flex items-center justify-center shrink-0 border border-gray-100">
                                <Car size={22} className="opacity-80" />
                            </div>
                            <div className="w-full flex justify-between items-center">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium mb-1 tracking-wide">EQUIPAMENTO</div>
                                    <div className="text-lg font-bold text-gray-800">{veiculo}</div>
                                </div>
                                <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono font-medium text-gray-600">
                                    {placa || 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gray-100/80" />

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-brand flex items-center justify-center shrink-0 border border-gray-100">
                                <Wrench size={22} className="opacity-80" />
                            </div>
                            <div>
                                <div className="text-gray-400 text-sm font-medium mb-1 tracking-wide">SERVIÇO EXECUTADO</div>
                                <div className="text-base text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                                    {servico}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Preview */}
                    {((data.tempPhotos && data.tempPhotos.length > 0) || (data.fotos && data.fotos.length > 0)) && (
                        <div className="mt-8 pt-6 border-t border-gray-100 border-dashed">
                            <div className="text-gray-400 text-sm font-medium mb-4 flex gap-2 items-center"><Camera size={14} /> FOTOS ANEXADAS</div>
                            <div className="grid grid-cols-2 gap-3">
                                {(data.tempPhotos && data.tempPhotos.length > 0 ? data.tempPhotos : data.fotos).map((url: string, index: number) => (
                                    <img key={index} src={url} alt={`Anexo ${index + 1}`} className="w-full h-32 object-cover rounded-xl border border-gray-100" />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 w-full text-center text-xs text-brand/40 font-semibold tracking-widest">
                        — {dataStr} —
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-[0_8px_20px_rgb(37,211,102,0.25)] hover:shadow-[0_8px_25px_rgb(37,211,102,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 hover:-translate-y-1"
                >
                    {isSharing ? <Loader2 className="animate-spin" size={20} /> : <Share2 size={20} />}
                    Compartilhar no WhatsApp
                </button>

                <button
                    onClick={onBack}
                    className="w-full flex items-center justify-center gap-2 bg-white text-brand border-2 border-brand hover:bg-gray-50 font-semibold py-4 px-6 rounded-2xl transition-all hover:-translate-y-1"
                >
                    <ArrowLeft size={20} />
                    Novo Serviço
                </button>
            </div>

        </div>
    );
}
