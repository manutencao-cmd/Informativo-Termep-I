import React, { useRef, useState } from 'react';
import { User, Car, Activity, Wrench, Share2, ArrowLeft, Loader2, Camera, ClipboardList } from 'lucide-react';
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
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">

            {/* Target for html2canvas */}
            <div
                ref={receiptRef}
                className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 flex flex-col"
            >
                {/* Header Section (Novo Design) */}
                <div className="bg-[#005f73] px-6 py-10 text-center text-white flex flex-col items-center">
                    <h2 className="text-sm font-normal tracking-wide opacity-90 mb-2">Informativo TERMEP</h2>
                    <div className="text-4xl font-bold tracking-tight mb-4">{valor !== 'Avaliação' ? valor : 'Status do Serviço'}</div>
                    <div className="text-sm font-light opacity-80 uppercase tracking-widest">
                        {valor !== 'Avaliação' ? 'Status do Serviço' : ''}
                    </div>
                </div>

                {/* Info List Section */}
                <div className="p-6 space-y-6 bg-white">

                    {/* Item: Cliente */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                            <User size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-800 uppercase">Cliente</div>
                            <div className="text-sm text-gray-600">{cliente}</div>
                        </div>
                    </div>

                    {/* Item: Equipamento */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                            <Car size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-800 uppercase">Equipamento</div>
                            <div className="text-sm text-gray-600">{veiculo} - {placa}</div>
                        </div>
                    </div>

                    {/* Item: Status */}
                    <div className="flex items-center gap-4 relative">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                            <Activity size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-800 uppercase">Status Atual</div>
                            <div className="text-sm text-gray-600">{status}</div>
                        </div>
                        <div className="absolute top-0 right-0 text-[10px] text-gray-400 font-medium">
                            {dataStr}
                        </div>
                    </div>

                    {/* Item: Serviço */}
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                            <Wrench size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-gray-800 uppercase">Serviço Realizado</div>
                            <div className="text-sm text-gray-600 leading-snug">{servico}</div>
                        </div>
                    </div>

                    {/* Large Photo Section */}
                    {((data.tempPhotos && data.tempPhotos.length > 0) || (data.fotos && data.fotos.length > 0)) && (
                        <div className="mt-4 pt-2">
                            <div className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
                                {(data.tempPhotos && data.tempPhotos.length > 0 ? data.tempPhotos : data.fotos).slice(0, 1).map((url: string, index: number) => (
                                    <img
                                        key={index}
                                        src={url}
                                        alt="Foto do Serviço"
                                        className="w-full h-auto object-contain block mx-auto"
                                        style={{ maxHeight: '600px' }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions (Not Captured) */}
            <div className="flex flex-col gap-3 px-4">
                <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70"
                >
                    {isSharing ? <Loader2 className="animate-spin" size={22} /> : <Share2 size={22} />}
                    Compartilhar no WhatsApp
                </button>

                <button
                    onClick={onBack}
                    className="w-full flex items-center justify-center gap-2 bg-white text-[#005f73] font-bold py-4 rounded-xl border-2 border-[#005f73] transition-all active:scale-95"
                >
                    <ArrowLeft size={22} />
                    Novo Serviço
                </button>
            </div>

        </div>
    );
}
