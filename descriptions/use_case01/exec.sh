eye --traditional --quick-answere --tactic transaction --query goal03.n3 knowledge.n3 preference.n3 RESTdesc_descriptions/* vocabularies/* inference/* > outputs/out.n3
eye --traditional outputs/out.n3 parser/services.n3 --query parser/composition.n3 --nope

#> outputs/parser.n3