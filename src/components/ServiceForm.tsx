import React, { useState } from 'react';
import { Camera, Car, User, FileText, CheckCircle, ChevronRight, Loader2, DollarSign } from 'lucide-react';
import { collection, addDoc, ref, uploadBytes, getDownloadURL, db, storage } from '../lib/firebase';
import { cn } from '../lib/cn';

interface ServiceFormProps {
    onSuccess: (data: any) => void;
}

export function ServiceForm({ onSuccess }: ServiceFormProps) {
    const [loading, setLoading] = useState(false);
    const [errorPhone, setErrorPhone] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Validate and format phone
        const rawPhone = (data.telefone as string).replace(/\D/g, '');
        if (!/^[0-9]{10,11}$/.test(rawPhone)) {
            setErrorPhone(true);
            return;
        }
        setErrorPhone(false);


        setLoading(true);

        try {
            const valorInput = data.valor as string;
            const valor = valorInput ? parseFloat(valorInput).toFixed(2) : '0.00';
            const hoje = new Date();

            let fotosUrls: string[] = [];
            let tempPhotos: string[] = []; // Used for raw preview before Firebase is done if needed

            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const localUrl = URL.createObjectURL(file);
                    tempPhotos.push(localUrl);

                    if (storage) {
                        try {
                            const fileName = `oficina/${Date.now()}_${file.name}`;
                            const storageRef = ref(storage, fileName);
                            const snapshot = await uploadBytes(storageRef, file);
                            const url = await getDownloadURL(snapshot.ref);
                            fotosUrls.push(url);
                        } catch (storageErr) {
                            console.warn("Falha no upload para o Storage (plano ou permissão):", storageErr);
                            // Continuamos sem a URL remota, usando apenas o blob local para o preview imediato
                        }
                    }
                }
            }

            const serviceData = {
                ...data,
                telefone: rawPhone,
                valor,
                fotos: fotosUrls,
                tempPhotos,
                data: hoje,
            };

            if (db) {
                await addDoc(collection(db, "servicos"), serviceData);
            }

            onSuccess({ ...serviceData, data: new Date() }); // Pass data up for the receipt preview
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar. Verifique o console.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-brand-light">
                    Novo Serviço
                </h1>
                <p className="text-gray-500 font-medium">Informativo Registro TERMEP</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Card 1: Cliente */}
                <div className="glass-card p-6 sm:p-8 relative group hover:border-brand-light/30 transition-colors">
                    <div className="absolute -left-3 -top-3 w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100/50 text-brand">
                        <User size={24} strokeWidth={1.5} />
                    </div>

                    <div className="space-y-4 pt-2">
                        <div>
                            <label htmlFor="cliente" className="label-text">Nome do Cliente *</label>
                            <input type="text" id="cliente" name="cliente" required className="input-field" placeholder="Ex: João Silva" />
                        </div>
                        <div>
                            <label htmlFor="telefone" className="label-text">WhatsApp (com DDD) *</label>
                            <input type="tel" id="telefone" name="telefone" required className={cn("input-field", errorPhone && "border-red-500")} placeholder="Ex: 11999999999" />
                            {errorPhone && <p className="text-red-500 text-sm mt-1">Digite apenas números (10 ou 11 dígitos).</p>}
                        </div>
                    </div>
                </div>

                {/* Card 2: Equipamento */}
                <div className="glass-card p-6 sm:p-8 relative group hover:border-brand-light/30 transition-colors">
                    <div className="absolute -left-3 -top-3 w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100/50 text-brand">
                        <Car size={24} strokeWidth={1.5} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                            <label htmlFor="veiculo" className="label-text">Equipamento/Veículo *</label>
                            <input type="text" id="veiculo" name="veiculo" required className="input-field" placeholder="Ex: Trator John Deere" />
                        </div>
                        <div>
                            <label htmlFor="placa" className="label-text">Placa/Identificação *</label>
                            <input type="text" id="placa" name="placa" required className="input-field" placeholder="Ex: ABC-1234" />
                        </div>
                    </div>
                </div>

                {/* Card 3: Serviço */}
                <div className="glass-card p-6 sm:p-8 relative group hover:border-brand-light/30 transition-colors">
                    <div className="absolute -left-3 -top-3 w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100/50 text-brand">
                        <FileText size={24} strokeWidth={1.5} />
                    </div>

                    <div className="space-y-4 pt-2">
                        <div>
                            <label htmlFor="status" className="label-text">Status Atual *</label>
                            <select id="status" name="status" required className="input-field appearance-none bg-white">
                                <option value="">Selecione o andamento...</option>
                                <option value="Em análise">Em análise</option>
                                <option value="Aguardando peça">Aguardando peça</option>
                                <option value="Em execução">Em execução</option>
                                <option value="Finalizado">Finalizado</option>
                                <option value="Entregue">Entregue</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="servico" className="label-text">Descrição do Serviço *</label>
                            <textarea id="servico" name="servico" required className="input-field min-h-[100px] resize-y" placeholder="Descreva os serviços realizados..." />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="valor" className="label-text flex items-center gap-1"><DollarSign size={16} /> Valor (opcional)</label>
                                <input type="number" id="valor" name="valor" step="0.01" className="input-field" placeholder="0.00" />
                            </div>
                            <div>
                                <label htmlFor="fotos" className="label-text flex items-center gap-1"><Camera size={16} /> Anexos</label>
                                <div className="relative">
                                    <input type="file" id="fotos" name="fotos" accept="image/*" multiple capture="environment" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <div className="input-field flex items-center justify-between bg-white text-gray-500 hover:bg-gray-50 transition-colors">
                                        <span>{files.length > 0 ? `${files.length} arquivo(s)` : 'Tirar Foto / Galeria'}</span>
                                        <ChevronRight size={18} className="opacity-50" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full relative group overflow-hidden rounded-2xl bg-brand text-white font-semibold text-lg p-5 shadow-[0_8px_20px_rgb(0,95,115,0.25)] hover:shadow-[0_8px_25px_rgb(0,95,115,0.4)] hover:-translate-y-1 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                        <span className="relative flex items-center justify-center gap-2">
                            {loading ? (
                                <><Loader2 className="animate-spin" /> Registrando...</>
                            ) : (
                                <><CheckCircle size={22} /> Gerar Informativo</>
                            )}
                        </span>
                    </button>
                </div>

            </form>
        </div>
    );
}
