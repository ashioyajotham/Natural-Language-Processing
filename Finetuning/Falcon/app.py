import gradio as gr
from transformers import AutoModelForCausalLM, AutoTokenizer

# Load the model and tokenizer
model_name = "ashioyajotham/falcon-coder"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

def generate_code(prompt):
    # Encode the code generation prompt
    prompt_input = tokenizer(prompt, return_tensors="pt", padding=True, truncation=True)

    # Generate Python code
    generated_ids = model.generate(prompt_input["input_ids"], max_length=200, do_sample=True, pad_token_id=tokenizer.eos_token_id)

    generated_code = tokenizer.decode(generated_ids[0], skip_special_tokens=True)

    return generated_code

# Create a Gradio interface
gr.Interface(generate_code, "textbox", "code").launch()

# Alternative: Launch the interface using the following code

#iface = gr.Interface(fn=generate_code, inputs="text", outputs="text")
#iface.launch()