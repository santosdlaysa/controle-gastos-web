export default function AssistentePage() {
  const features = [
    { icon: "📊", title: "Análise de gastos", desc: "Análise detalhada dos seus gastos por categoria e mês" },
    { icon: "🔍", title: "Padrões e economias", desc: "Identificação de padrões e oportunidades de economia" },
    { icon: "💬", title: "Linguagem natural", desc: "Perguntas sobre suas finanças em linguagem natural" },
    { icon: "📋", title: "Relatórios inteligentes", desc: "Resumos e relatórios automáticos gerados por IA" },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Hero */}
      <div className="rounded-2xl p-8 mb-6 relative overflow-hidden text-center" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(-30%, 30%)" }} />

        {/* Em breve badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-5" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}>
          ✨ EM BREVE
        </div>

        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-2xl font-bold text-white mb-2">Assistente Financeiro</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          Seu consultor pessoal com IA, disponível em breve
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-6">
        {features.map((f) => (
          <div key={f.title} className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: "rgba(168,85,247,0.15)" }}
            >
              {f.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{f.title}</div>
              <div className="text-xs text-muted mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status info */}
      <div className="rounded-2xl p-4 border" style={{ borderColor: "rgba(168,85,247,0.25)", backgroundColor: "rgba(168,85,247,0.07)" }}>
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0">⏳</span>
          <p className="text-xs text-muted leading-relaxed">
            O assistente estará disponível assim que a integração com IA for ativada. Fique de olho nas atualizações!
          </p>
        </div>
      </div>
    </div>
  );
}
