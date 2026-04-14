FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt

RUN git clone --depth=1 https://github.com/shiyu-coder/Kronos.git

WORKDIR /opt/Kronos

RUN python -m pip install --no-cache-dir --upgrade pip \
  && python -m pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch \
  && grep -v '^torch' requirements.txt > /tmp/kronos-requirements.txt \
  && python -m pip install --no-cache-dir -r /tmp/kronos-requirements.txt

WORKDIR /workspace

CMD ["bash"]
